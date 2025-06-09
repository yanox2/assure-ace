/* Copyright 2025 dodat */
/*---------------------------------------------------------------------------*
 * Class - BaseWindow
 *      ウィンドウ基底クラス
 *---------------------------------------------------------------------------*/
import { BrowserWindow, ipcMain, Menu, type MenuItemConstructorOptions, dialog } from "electron";
import path from "path";
import type { Coord, CloseListener } from "../types/types.mjs";
import Exception from "../cmn/Exception.mjs";
import AppBase from "./AppBase.mjs";
import Puppeteer from "../Puppeteer.mjs";

abstract class BaseWindow{
	protected abstract myInit(crrtDir: string): Promise<void>;

	protected win?: BrowserWindow;
	protected myPage: Puppeteer = new Puppeteer(); // BrowserWindowの画面制御にpuppeteerを利用
	private static Win__: BrowserWindow;

/*---------------------------------------------------------------------------*
 * public methods
 *---------------------------------------------------------------------------*/
	public async init(loadFile: string, preloadFile?: string, lis?: CloseListener){
		const coord: Coord|undefined = AppBase.getSettings("mainWinCoord");
		if(preloadFile){
			const preFile: string = path.join(AppBase.dirname, preloadFile);
			this.win = BaseWindow.createWindow("MainWindow", coord, preFile);
		}else{
			this.win = BaseWindow.createWindow("MainWindow", coord);
		}
		if(lis){
			this.win.on("close", () => {
				const coord: Coord|undefined = BaseWindow.getBounds(this.win);
				if(coord) lis.onClose(coord);
			});
			this.win.on("closed", () => {
				lis.onClosed();
			});
		}
		BaseWindow.Win__ = this.win;

		this.myMenu();
		this.UIhandler();
		const mainHtml: string = path.join(AppBase.dirname, loadFile);
		await this.win.loadFile(mainHtml);
		await this.myPage.getMyPage();
		this.myInit(AppBase.dirname);
	}

	// ウィンドウ生成
	public static createWindow(title: string = "MainWindow", coord?: Coord, preload?: string): BrowserWindow{
		let params: Electron.BrowserWindowConstructorOptions = {
			title: title
		};
		if(coord){
			const additional: Electron.BrowserWindowConstructorOptions = {
				width: coord.width,
				height: coord.height,
				x: coord.x,
				y: coord.y
			};
			params = {...params, ...additional};
		}
		if(preload){
			params.webPreferences = {
				//contextIsolation: true, // default
				//nodeIntegration: false, // default
				preload: preload
			}
		}
		return new BrowserWindow(params);
	}

	public static getBounds(win: BrowserWindow|undefined): Coord|undefined{
		if(!win) return undefined;
		const bounds: Electron.Rectangle|undefined = win.getBounds();
		const coord: Coord|undefined = bounds ? {
			width: bounds.width,
			height: bounds.height,
			x: bounds.x,
			y: bounds.y
		} : undefined;
		return coord;
	}

	public static alert(type: number, message: string, title?: string){
		let val: "none" | "info" | "error" | "question" | "warning" = "none";
		if(type == 1) val = "error";
		dialog.showMessageBoxSync(BaseWindow.Win__, {
			type: val,
			title: title,
			message: message,
			buttons: ["OK"]
		});
	}

	public static confirm(message: string): boolean{
		const res: number = dialog.showMessageBoxSync(BaseWindow.Win__, {
			type: "none",
			title: "確認",
			message: message,
			buttons: ["OK", "キャンセル"],
			defaultId: 0,
			cancelId: 1,
			noLink: true
		});
		return !res;
	}

/*---------------------------------------------------------------------------*
 * protected methods
 *---------------------------------------------------------------------------*/
	// デフォルトUIハンドラ
	protected UIhandler(){
		// ボタン
		ipcMain.handle("testSend", async (e, no: number) => {
			Exception.log(no);
			return "test" + no;
		});
	}

	// デフォルトメニュー
	protected myMenu(){
		const item: MenuItemConstructorOptions[] = [{
			id: "File",
			label: "ファイル(F)",
			accelerator: "Alt+F",
			submenu: [{
				id: "New",
				accelerator: "CmdOrCtrl+N",
				label: "新規作成",
				click: () => {
					Exception.log("");
				}
			},{
				id: "Open",
				accelerator: "CmdOrCtrl+O",
				label: "開く",
				click: () => {
					Exception.log("");
				}
			},{
				id: "Save",
				accelerator: "CmdOrCtrl+S",
				label: "上書き保存",
				click: () => {
					Exception.log("");
				},
				enabled: false
			},{
				id: "SaveAs",
				accelerator: "CmdOrCtrl+Shift+S",
				label: "名前を付けて保存",
				click: () => {
					Exception.log("");
				}
			},{
				type: "separator"
			}]
		},{
			id: "Help",
			label: "ヘルプ(H)",
			accelerator: "Alt+H",
			submenu: [{
				id: "Version",
				label: "バージョン情報",
				click: () => {
					Exception.log("");
				}
			}]
		}];
		const menu: Menu = Menu.buildFromTemplate(item);
		Menu.setApplicationMenu(menu);
	}
}
export default BaseWindow;
