/* Copyright 2025 dodat */
/*---------------------------------------------------------------------------*
 * Class - AssureAce
 *      製品クラス
 *---------------------------------------------------------------------------*/
import type { Coord, Settings } from "./types/types.mjs";
import Exception from "./cmn/Exception.mjs";
import AppBase from "./cmn/AppBase.mjs";
import type BaseWindow from "./cmn/BaseWindow.mjs";
import AppWindow from "./AppWindow.mjs";

class AssureAce extends AppBase{

/*---------------------------------------------------------------------------*
 * implements abstract AppBase
 *---------------------------------------------------------------------------*/
	protected async myInit(){
		Exception.setLevel(1);
		const win: BaseWindow = new AppWindow();
		await win.init("main.html", "ipc/preload.cjs", this);
	}

	protected initSettings(): Settings{
		const coord: Coord = {"width":1024, "height":576, "x":50, "y":50};
		return {"mode":1, "mainWinCoord":coord, "subWinCoord":coord, "defaultPlayer":1};
	}
}
export default AssureAce;
