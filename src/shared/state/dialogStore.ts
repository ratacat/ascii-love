import { create } from 'zustand'

const focusCanvasSurface = () => {
  if (typeof document === 'undefined') {
    return
  }
  const canvas = document.querySelector<HTMLElement>('.canvas-viewport__canvas')
  if (canvas) {
    canvas.focus({ preventScroll: true })
    return
  }
  if (typeof window !== 'undefined' && typeof window.focus === 'function') {
    window.focus()
  }
}

type ConfirmDialogDescriptor = {
  kind: 'confirm'
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  resolve: (confirmed: boolean) => void
  restoreFocus?: () => void
}

type PromptDialogDescriptor = {
  kind: 'prompt'
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  defaultValue?: string
  placeholder?: string
  resolve: (input: string | null) => void
  restoreFocus?: () => void
}

export type DialogDescriptor = ConfirmDialogDescriptor | PromptDialogDescriptor

interface DialogStoreState {
  descriptor: DialogDescriptor | null
  setDescriptor: (descriptor: DialogDescriptor | null) => void
}

const useDialogStore = create<DialogStoreState>((set) => ({
  descriptor: null,
  setDescriptor: (descriptor) => set({ descriptor }),
}))

const closeDialog = () => {
  const current = useDialogStore.getState().descriptor
  useDialogStore.getState().setDescriptor(null)
  if (current?.restoreFocus) {
    requestAnimationFrame(() => current.restoreFocus?.())
  } else {
    requestAnimationFrame(() => focusCanvasSurface())
  }
}

const replaceDialog = (descriptor: DialogDescriptor) => {
  const current = useDialogStore.getState().descriptor
  if (current) {
    if (current.kind === 'prompt') {
      current.resolve(null)
    } else {
      current.resolve(false)
    }
  }
  useDialogStore.getState().setDescriptor(descriptor)
}

type ConfirmDialogOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
}

export const showConfirmDialog = (options: ConfirmDialogOptions): Promise<boolean> => {
  if (typeof window === 'undefined') {
    return Promise.resolve(false)
  }

  return new Promise((resolve) => {
    replaceDialog({
      kind: 'confirm',
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      resolve: (result) => {
        resolve(result)
      },
      restoreFocus: focusCanvasSurface,
    })
  })
}

type PromptDialogOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  defaultValue?: string
  placeholder?: string
}

export const showPromptDialog = (options: PromptDialogOptions): Promise<string | null> => {
  if (typeof window === 'undefined') {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    replaceDialog({
      kind: 'prompt',
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? 'Save',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      defaultValue: options.defaultValue ?? '',
      placeholder: options.placeholder,
      resolve: (result) => {
        resolve(result)
      },
      restoreFocus: focusCanvasSurface,
    })
  })
}

export const useActiveDialog = () => useDialogStore((state) => state.descriptor)

export const dismissActiveDialog = () => {
  const current = useDialogStore.getState().descriptor
  if (!current) {
    return
  }
  if (current.kind === 'prompt') {
    current.resolve(null)
  } else {
    current.resolve(false)
  }
  closeDialog()
}

export const confirmActiveDialog = (value?: string) => {
  const current = useDialogStore.getState().descriptor
  if (!current) {
    return
  }
  if (current.kind === 'prompt') {
    current.resolve(value ?? current.defaultValue ?? '')
  } else {
    current.resolve(true)
  }
  closeDialog()
}

export const cancelActiveDialog = () => {
  const current = useDialogStore.getState().descriptor
  if (!current) {
    return
  }
  if (current.kind === 'prompt') {
    current.resolve(null)
  } else {
    current.resolve(false)
  }
  closeDialog()
}

