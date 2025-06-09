/* Copyright 2025 dodat */
/*---------------------------------------------------------------------------*
 * Class - AppWindow
 *      メインウィンドウ
 *---------------------------------------------------------------------------*/
import { app } from "./main.mjs";
import { ipcMain, Menu, type MenuItemConstructorOptions, dialog } from "electron";
import path from "path";
import { type Page } from "puppeteer";

import { VERSION } from "./constants/defines.mjs";
import Exception from "./cmn/Exception.mjs";
import AppBase from "./cmn/AppBase.mjs";
import BaseWindow from "./cmn/BaseWindow.mjs";
import ScriptBuilder from "./ScriptBuilder.mjs";
import SimBrowser from "./SimBrowser.mjs";

declare function setTitle(title: string): void;
declare function openSettingsModal(no: number): void;
declare function msgSuccess(message: string, title?: string): void;
declare function msgError(message: string, title?: string): void;

class AppWindow extends BaseWindow{
	private menu_: Menu = Menu.buildFromTemplate([]);
	private builder_: ScriptBuilder = new ScriptBuilder();
	private simBrowser_: SimBrowser = new SimBrowser();

	private saveTitle_: string = "Untitled";
	private saveDir_: string = "";

/*---------------------------------------------------------------------------*
 * implements abstract BaseWindow
 *---------------------------------------------------------------------------*/
	protected async myInit(crrtDir: string){
		this.builder_ = new ScriptBuilder(this.myPage, this.win?.webContents);
		this.builder_.receiver();
		await this.simBrowser_.setScript(crrtDir, "ipc/ext.js");
		this.simBrowser_.setCloseListener(this.builder_);
		this.saveDir_ = crrtDir;
		this.win?.webContents.openDevTools();
		//await this.test();
	}

/*---------------------------------------------------------------------------*
 * override BaseWindow UIhandler
 *---------------------------------------------------------------------------*/
	protected UIhandler(){
		super.UIhandler();

		// --- for Button controled ---
		// launch button
		ipcMain.on("launch", async (e, url: string) => {
			if(!url) return;
			const no: number = await this.simBrowser_.launch();
			this.simBrowser_.goto(no, 1, url);
		});

		// play/stop
		ipcMain.on("play", async () => {
			const num: number = this.builder_.numSteps();
			if(num == 0){
				this._message(1, "実行するテストステップがありません。");
				return;
			}
			const broNum: number = this.simBrowser_.numWindows();
			if(broNum > 0){
				this._message(1, "レコード中のブラウザを終了してください。");
				return;
			}

			const ok: boolean = BaseWindow.confirm("スクリプトの実行を開始します。よろしいですか？");
			if(!ok) return;
			this._record(false);
			const rc: number = await this.builder_.play();
			if(rc == 0) return;
			this._changeRunMenuEnabled(false);
			this._message(0, "スクリプトの実行を開始しました。");
		});

		// record on/off
		ipcMain.on("record", async (e, state: boolean) => {
			this._record(state);
		});

		// --- for SubMenu select ---
		// menu TestStep
		ipcMain.handle("menuTestStep", async (e, no: number, menu: number) => {
			const menuMsgs: string[] = ["",
				"スリープのステップを追加しました。",
				"スクリーンショットのステップを追加しました。",
				"チェックスクリプトのステップを追加しました。"
			];
			const msg: string = menuMsgs[menu];
			const op: Operation|undefined = await this.builder_.menuTestStep(no, menu);
			let res: IPCResponse = { rcode:0, message:msg, op:op };
			return res;
		});

		// --- for SubMenu post ---
		// edit TestStep
		ipcMain.handle("editTestStep", async (e, postData: string) => {
			const data: Record<string, unknown> = Object.fromEntries(new URLSearchParams(postData));
			const rc: number = await this.builder_.editTestStep(data);
			const res: IPCResponse = { rcode:0, message:"テストステップを編集しました。" };
			return res;
		});

		// edit TestStepSp
		ipcMain.handle("editTestStepSp", async (e, postData: string) => {
			const data: Record<string, unknown> = Object.fromEntries(new URLSearchParams(postData));
			const rc: number = await this.builder_.editTestStep(data);
			const res: IPCResponse = { rcode:0, message:"テストステップを編集しました。" };
			return res;
		});

		// edit Settings
		ipcMain.handle("editSettings", async (e, postData: string) => {
			const data: Record<string, unknown> = Object.fromEntries(new URLSearchParams(postData));
			const player = data["post_browserType"] as number;
			AppBase.setSettings("defaultPlayer", player);
			await AppBase.saveSettings();
			const res: IPCResponse = { rcode:0, message:"設定を編集しました。", test:"テスト" };
			return res;
		});

		// --- for message ---
		ipcMain.handle("alert", async (e, type: number, message: string, title?: string) => {
			// alertでfocusが戻らないElectronの不具合（入力できなくなる）
			// dialog.showMessageBoxSyncを使用
			BaseWindow.alert(type, message, title);
		});
		ipcMain.on("message", (e, type: number, message: string, title?: string) => {
			this._message(type, message, title);
		});

		// --- for test ---
		ipcMain.handle("testSended", async (e, no: number, op: Operation) => {
			if(!op) return "Error!";
			Exception.log(op.selector1, 1);
			return no + " success!";
		});
	}

	private _record(st: boolean){
		const rc = this.builder_.record(st);
		if(rc < 1) return;
		const msg: string = st ? "レコーディングを開始しました。" : "レコーディングを停止しました。";
		this._message(0, msg);
	}

	private _changeRunMenuEnabled(enabled: boolean){
		const ids: string[] = ["RunChrome_p", "RunChrome", "RunEdge", "RunFireFox"];
		ids.forEach((id) => {
			const item = this.menu_.getMenuItemById(id);
			if(item) item.enabled = enabled;
	 	});
		const item = this.menu_.getMenuItemById("Stop");
		if(item) item.enabled = !enabled;
	}

/*---------------------------------------------------------------------------*
 * override BaseWindow myMenu
 *---------------------------------------------------------------------------*/
	protected myMenu(){
		const item: MenuItemConstructorOptions[] = [{
			id: "File",
			label: "ファイル(F)",
			accelerator: "Alt+F",
			submenu: [{
				id: "New",
				accelerator: "CmdOrCtrl+N",
				label: "新規作成",
				click: async () => {
					await this._newFile();
				}
			},{
				id: "Open",
				accelerator: "CmdOrCtrl+O",
				label: "開く",
				click: async () => {
					await this._load();
				}
			},{
				id: "Save",
				accelerator: "CmdOrCtrl+S",
				label: "上書き保存",
				click: () => {
					this._save("上書き保存");
				}
			},{
				id: "SaveAs",
				accelerator: "CmdOrCtrl+Shift+S",
				label: "名前を付けて保存",
				click: () => {
					this._save("名前を付けて保存");
				}
			},{
				type: "separator"
			},{
				id: "ExportAsPuppeteer",
				label: "出力（Puppeteer）",
				click: () => {
					Exception.log("");
				}
			},{
				id: "ExportAsPlaywright",
				label: "出力（Playwright）",
				click: () => {
					Exception.log("");
				}
			},{
				type: "separator"
			},{
				id: "Settings",
				label: "設定",
				click: () => {
					const player = AppBase.getSettings("defaultPlayer");
					this.myPage.evaluate((player) => {
						openSettingsModal(player);
					}, player).catch();
				}
			},{
				type: "separator"
			},{
				id: "Exit",
				accelerator: "Alt+F4",
				label: "終了",
				click: async () => {
					const rc = BaseWindow.confirm("アプリケーションを終了します。よろしいですか？");
					if(!rc) return;
					app.quit();
				}
			}]
		},{
			id: "Run",
			label: "実行(R)",
			accelerator: "Alt+R",
			submenu: [{
				id: "RunChrome_p",
				label: "Play Chrome (Puppeteer)",
				click: () => {
					Exception.log("");
				}
			},{
				type: "separator"
			},{
				id: "RunChrome",
				label: "Play Chrome (Playwright)",
				click: () => {
					Exception.log("");
				}
			},{
				id: "RunEdge",
				label: "Play Edge (Playwright)",
				click: () => {
					Exception.log("");
				}
			},{
				id: "RunFireFox",
				label: "Play FireFox (Playwright)",
				click: () => {
					Exception.log("");
				}
			},{
				type: "separator"
			},{
				id: "Stop",
				label: "Stop playing",
				click: async () => {
					await this.builder_.stop();
					this._changeRunMenuEnabled(true);
					this._message(0, "スクリプトの実行を停止しました。");
				},
				enabled: false
			}]
		},{
			id: "Help",
			label: "ヘルプ(H)",
			accelerator: "Alt+H",
			submenu: [{
				id: "Version",
				label: "バージョン情報",
				click: () => {
					BaseWindow.alert(0, "Assure Ace\n"+ VERSION);
				}
			}]
		}];
		this.menu_ = Menu.buildFromTemplate(item);
		Menu.setApplicationMenu(this.menu_);
	}

	private async _newFile(){
		if(!this.win) return;
		const num: number = this.builder_.numSteps();
		if(num > 0){
			const rc = BaseWindow.confirm("現在のテストステップが破棄され、新規に作成します。よろしいですか？");
			if(!rc) return;
		}

		const title = "Untitled";
		try{
			await this.builder_.allClear(title);
			this.myPage.evaluate(() => {
				setTitle("Untitled");
			});

		}catch(err){
			this._message(1, "テストステップのクリアに失敗しました。", "新規作成");
			return;
		}
		this.saveTitle_ = title;
		this._message(0, "テストステップをクリアしました。", "新規作成");
	}

	private async _load(){
		if(!this.win) return;
		const { canceled, filePaths } = await dialog.showOpenDialog(this.win, {
			title: "ファイルを開く",
			properties: ["openFile"],
			filters: [
				{name:"Ace Files", extensions:["ace"]},
				{name:"All Files", extensions:["*"]}
			],
		});
		if(canceled || (filePaths.length === 0)) return;

		const filename = path.basename(filePaths[0]);
		let title = filename;
		let dir = path.dirname(filePaths[0]);
		try{
			title = await this.builder_.load(filename, dir);
			this.myPage.evaluate((title: string) => {
				setTitle(title);
			}, title);

		}catch(err){
			this._message(1, "テストステップの読み込みに失敗しました。", "開く");
			return;
		}
		this.saveTitle_ = title;
		this.saveDir_ = dir;
		this._message(0, "テストステップを読み込みました。", "開く");
	}

	private async _save(label: string){
		if(!this.win) return;
		const num: number = this.builder_.numSteps();
		if(num < 1){
			this._message(1, "保存するステップがありません。", label);
			return;
		}

		let title = this.saveTitle_;
		let dir = this.saveDir_;
		if(label === "名前を付けて保存"){
			const { canceled, filePath } = await dialog.showSaveDialog(this.win, {
				title: label,
				defaultPath: path.join(this.saveDir_, "Untitled.ace"),
				filters: [
					{name:"Ace Files", extensions:["ace"]},
					{name:"All Files", extensions:["*"]}
				]
			});
			if(canceled || !filePath) return;
			title = path.basename(filePath);
			if(title.endsWith(".ace")) title = title.slice(0, -4);
			dir = path.dirname(filePath);
		}

		try{
			this.builder_.save(title, dir);
			this.myPage.evaluate((title: string) => {
				setTitle(title);
			}, title);

		}catch(err){
			this._message(1, "テストステップの保存に失敗しました。", label);
			return;
		}
		this.saveTitle_ = title;
		this.saveDir_ = dir;
		this._message(0, "テストステップを保存しました。", label);
	}

/*---------------------------------------------------------------------------*
 * private methods for Message
 *---------------------------------------------------------------------------*/
	// toastr message
	private async _message(type: number, message: string, title?: string){
		this.myPage.evaluate((type: number, message: string, title: string) => {
			if(type === 0){
				msgSuccess(message, title);
			}else if(type === 1){
				msgError(message, title);
			}
		}, type, message, title).catch((err) => {
		});
	}

/*---------------------------------------------------------------------------*
 * test
 *---------------------------------------------------------------------------*/
	public async test(){
/* executeJavaScript
		const val = await this.win?.webContents.executeJavaScript(`
			console.log("aaa");
			var ele = document.getElementById("post_url");
			if(ele){
				console.log("bbb");
				"ccc";
			}else{
				"ddd";
			}
		`).catch(function(err){
			new Exception("ExecuteJavaScript error occured.", err);
		});
		console.log(val);
*/
		const page: Page|undefined = await this.myPage.getMyPage();
		if(!page){
			Exception.log("Page is undefined.");
			return;
		}
		console.log(await page.title());

		await page.evaluate(() => {
			console.log("eee");
		}).catch((err) =>{
			new Exception("evaluate error occured.", err);
		});

		const val2 = await this.myPage.evaluate(() => {
			console.log("fff");
			var ele = document.getElementById("post_url") as HTMLInputElement;
			if(ele) return ele.value;
			return "ggg";
		}).catch((err) =>{
			new Exception("evaluate2 error occured.", err);
		});
		console.log(val2);
		page.on("console", msg => Exception.log("PAGE LOG:" + msg.text()));
/*
		this.myPage.evaluate(() => {
			console.log("axs");
			var ele = document.getElementById("id_steps");
			var tag:string = '<td>4</td>'
				+ ' <td>'
				+ '  <i class="fa fa-pencil-square-o"></i>'
				+ '  　textbox の<code>id_XXXXXXXX</code>に入力'
				+ ' </td>'
				+ ' <td class="text-right"><span class="label label-default">Enable</span></td>'
				+ ' <td class="text-right">'
				+ '  <div class="btn-group text-center" style="width:15px;">'
				+ '   <i class="fa fa-ellipsis-v"></i>'
				+ '  </div>'
				+ ' </td>';
			if(ele) ele.append(tag);
		});
*/
	}
}
export default AppWindow;
