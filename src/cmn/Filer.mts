/* Copyright 2025 dodat */
/*---------------------------------------------------------------------------*
 * Class - JSONFile
 *      ファイル操作
 *---------------------------------------------------------------------------*/
import { promises as fs } from "fs";
import path from "path";
import Exception from "./Exception.mjs";

export async function readFile(dir: string, fileName: string): Promise<string>{
	const filePath: string = path.resolve(dir, fileName);
	try{
		const data: string = await fs.readFile(filePath, "utf-8");
		if(!data.trim()) throw new Exception("No data.");
		return data;

	}catch(err){
		const errno = err as NodeJS.ErrnoException;
		if(errno.code === "ENOENT"){ // ファイルがない
			throw new Exception("File not found.", err);
		}else{
			throw new Exception("Error reading file", err);
		}
	}
}

export async function writeFile(dir: string, fileName: string, data: string){
	const filePath: string = path.resolve(dir, fileName);
	try{
		await fs.writeFile(filePath, data, "utf-8");
	}catch(err){
		throw new Exception("Error writing file", err);
	}
}

export async function readFileAndParse<T>(dir: string, fileName: string, parseAs: any): Promise<T>{
	const filePath: string = path.resolve(dir, fileName);
	let data: string;
	try{
		if(parseAs === "Buffer"){
			const buf: Buffer = await fs.readFile(filePath);
			if(buf.length === 0) throw new Exception("No data.");
			return buf as T;
		}

		data = await fs.readFile(filePath, "utf-8");
		if(!data.trim()) throw new Exception("No data.");
		if(parseAs === "string"){
			return data as T;
		}else if(parseAs === Map){
			const json = JSON.parse(data.toString());
			return new Map(Object.entries(json)) as T;
		}else if(parseAs === Object){
			return JSON.parse(data.toString()) as T;
		}else{
			throw new Error("Unsupported type for parsing");
		}
	
	}catch(err){
		const errno = err as NodeJS.ErrnoException;
		if(errno.code === "ENOENT"){ // ファイルがない
			throw new Exception("File not found.", err);
		}else{
			throw new Exception("Error reading file", err);
		}
	}
}

export async function writeFileAndParse(dir: string, fileName: string, data: any){
	const filePath: string = path.resolve(dir, fileName);
	try{
		if(Buffer.isBuffer(data)){
			await fs.writeFile(filePath, data);
		}else{
			let dataStr: string;
			if(typeof data === "string"){
				dataStr = data;
			}else if(data instanceof Map){
				dataStr = JSON.stringify(Object.fromEntries(data), null, 2);
			}else if(typeof data === "object"){
				dataStr = JSON.stringify(data, null, 2);
			}else{
				throw new Exception("Unsupported content type.");
			}
			await fs.writeFile(filePath, dataStr, "utf-8");
		}

	}catch(err){
		throw new Exception("Error writing file", err);
	}
}

export function toString(data: any): string|Buffer{
	let buf: string|Buffer;
	if(Buffer.isBuffer(data)){
		buf = data;
	}else if(typeof data === "string"){
		buf = data;
	}else if(data instanceof Map){
		buf = JSON.stringify(Object.fromEntries(data), null, 2);
	}else if(typeof data === "object"){
		buf = JSON.stringify(data, null, 2);
	}else{
		throw new Exception("Unsupported content type.");
	}
	return buf;
}
