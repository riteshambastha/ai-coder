interface Window {
    showDirectoryPicker(): Promise<FileSystemDirectoryHandle>;
    showOpenFilePicker(): Promise<FileSystemFileHandle[]>;
    showSaveFilePicker(): Promise<FileSystemFileHandle>;
  }