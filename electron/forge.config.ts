import MakerDeb from '@electron-forge/maker-deb'
import MakerDmg from '@electron-forge/maker-dmg'
import MakerRpm from '@electron-forge/maker-rpm'
import MakerSquirrel from '@electron-forge/maker-squirrel'
import MakerZip from '@electron-forge/maker-zip'
import MakerNsis from '@electron-addons/electron-forge-maker-nsis'
import { VitePlugin } from '@electron-forge/plugin-vite'
import type { ForgeConfig } from '@electron-forge/shared-types'

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZip({}),
    new MakerDmg({}),
    new MakerDeb({}),
    new MakerRpm({}),
    new MakerNsis({
      arch: 'x64',
      options: {
        oneClick: false,
        perMachine: false,
      },
    }),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'electron/main.ts',
          config: 'electron/vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'electron/preload.ts',
          config: 'electron/vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'electron/vite.renderer.config.ts',
        },
      ],
    }),
  ],
}

export default config
