/* Copyright 2025 dodat */
/*---------------------------------------------------------------------------*
 * Preload
 *      プリロードスクリプト
 *---------------------------------------------------------------------------*/
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("AABridge", {
	launch: (url: string) => ipcRenderer.send("launch", url),
	play: () => ipcRenderer.send("play"),
	record: (state: boolean) => ipcRenderer.send("record", state),
	menuTestStep: (no: number, menu: number) => ipcRenderer.invoke("menuTestStep", no, menu),
	editTestStep: (postData: string) => ipcRenderer.invoke("editTestStep", postData),
	editTestStepSp: (postData: string) => ipcRenderer.invoke("editTestStepSp", postData),
	editSettings: (postData: string) => ipcRenderer.invoke("editSettings", postData),
	alert: (type: number, message: string, title?: string) => ipcRenderer.invoke("alert", type, message, title),
	message: (type: number, message: string, title?: string) => ipcRenderer.send("message", type, message, title)
});
