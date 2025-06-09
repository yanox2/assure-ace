/* Copyright 2025 dodat */
/*---------------------------------------------------------------------------*
 * Class - AppBase
 *      アプリケーションベースクラス
 *---------------------------------------------------------------------------*/
import { app } from "../main.mjs";
import { SETTINGS_FILE } from "../constants/defines.mjs";
import type { Coord, Settings, CloseListener } from "../types/types.mjs";
import Exception from "../cmn/Exception.mjs";
import JSONFile from "../cmn/JSONFile.mjs";

abstract class AppBase implements CloseListener{
	protected abstract initSettings(): Settings;
	protected abstract myInit(): Promise<void>;

	public static readonly dirname: string = app.getAppPath();
	private static settings__: Settings;

	constructor(){
		AppBase.settings__ = this.initSettings();
		Exception.setLevel(0);
	}

	public async init(){
		try{
			const json = new JSONFile(AppBase.dirname, AppBase.settings__);
			AppBase.settings__ = await json.readFile(SETTINGS_FILE);
			await this.myInit();
		}catch(err){
			new Exception("", err);
		}
	}

	public static getSettings<K extends keyof Settings>(name: K): Settings[K]|undefined{
		if(!(name in AppBase.settings__)) return undefined;
		return AppBase.settings__[name];
	}

	public static setSettings<K extends keyof Settings>(name: K, value: Settings[K]){
		if(name in AppBase.settings__){
			AppBase.settings__[name] = value;
		}else{
			new Exception(`Property '${name}' does not exist in settings.`);
		}
	}

	public static async saveSettings(){
		try{
			const json = new JSONFile(AppBase.dirname);
			await json.writeFile(SETTINGS_FILE, AppBase.settings__);
		}catch(err){
			new Exception("", err);
		}
	}

/*---------------------------------------------------------------------------*
 * implements CloseListener
 *---------------------------------------------------------------------------*/
	public async onClose(coord: Coord){
		//JSONFile.merge(AppBase.settings__, {"mainWinCoord":coord});
		AppBase.setSettings("mainWinCoord", coord);
		await AppBase.saveSettings();
	}

	public async onClosed(){
		if(process.platform !== "darwin") app.quit();
	}
}
export default AppBase;
