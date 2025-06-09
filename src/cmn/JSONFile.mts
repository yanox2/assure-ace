/* Copyright 2025 dodat */
/*---------------------------------------------------------------------------*
 * Class - JSONFile
 *      JSONファイル操作
 *---------------------------------------------------------------------------*/
import { promises as fs } from "fs";
import path from "path";
import Exception from "./Exception.mjs";

class JSONFile{
	private path_: string;
	private initData_: any;

	constructor(path: string, initData?: any){
		this.path_ = path;
		this.initData_ = initData;
	}

	public async readFile(fileName: string): Promise<any>{
		const filePath: string = path.resolve(this.path_, fileName);
		try{
			const data: string = await fs.readFile(filePath, "utf-8");
			if(!data.trim()){
				if(this.initData_) await this.writeFile(fileName, this.initData_);
				return this.initData_;
			}
			let jsonData: any = JSON.parse(data); // ファイルサイズ0のとき無応答となる
			if(this.initData_) jsonData = Object.assign({}, this.initData_, jsonData);
		    return jsonData;

		}catch(err){
			const errno = err as NodeJS.ErrnoException;
			if(errno.code === "ENOENT"){ // ファイルがない
				if(this.initData_) await this.writeFile(fileName, this.initData_);
				return this.initData_;
			}else{
				throw new Exception("Error reading JSON file", err);
			}
		}
	}

	public async writeFile(fileName: string, jsonData: any){
		const filePath: string = path.resolve(this.path_, fileName);
		if(jsonData instanceof Map){
			jsonData = Array.from(jsonData.entries());
		}
		try{
			const data: string = JSON.stringify(jsonData, null, 2);
			await fs.writeFile(filePath, data, "utf-8");

		}catch(err){
			throw new Exception("Error writing JSON file", err);
		}
	}

	public static merge<T extends object>(target: T, source: Partial<T>): T{
		for(const key of Object.keys(source) as Array<keyof T>){
			if(source[key] instanceof Object && key in target){
				const t = source[key];
				if(t) Object.assign(t, JSONFile.merge((target as any)[key], (source as any)[key]));
			}
		}
		return Object.assign(target || {}, source);
	}

	public static toString(obj: any, prefix=""): string{
		return Object.keys(obj).map(key => {
			const value = obj[key];
			const newKey = prefix ? `${prefix}.${key}` : key;

			if(typeof value === "object" && value !== null){
				return JSONFile.toString(value, newKey);
			}else{
				return `${newKey}:${value}`;
			}
		}).join(", ");
	}
}
export default JSONFile;
