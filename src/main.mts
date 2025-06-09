/* Copyright 2025 dodat */
/*---------------------------------------------------------------------------*
 * Main
 *      メイン
 *---------------------------------------------------------------------------*/
import { app, session } from "electron";
import type AppBase from "./cmn/AppBase.mjs";
import AssureAce from "./AssureAce.mjs";
import Puppeteer from "./Puppeteer.mjs";

await Puppeteer.preproc(app);

const main = async () => {
	const appBase: AppBase = new AssureAce();
	await appBase.init();
};

app.whenReady().then(async () => {
	session.defaultSession.clearCache();
	await main();
});

app.on("window-all-closed", async () => {
	if(process.platform !== "darwin") app.quit();
});

export {app};
