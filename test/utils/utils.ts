import * as fs from "fs";
import * as child from "child_process";
import * as path from "path";
import {Terminal} from "../../src/utils/terminal";

//Windows spawn work around
let spawnSync: any = child.spawnSync;
if (process.platform === 'win32') {
    spawnSync = (cmd: string, args: string[]) => {
        return child.spawnSync('node.exe', [cmd].concat(args));
    }
}

/**
 * Compile TurboScript to WebAssembly and instantiate synchronously
 * @param sourcePath
 * @param imports
 * @param outputFile
 * @returns {WebAssembly.Instance}
 */
export function getWasmInstanceSync(sourcePath: string, imports: any = {}, outputFile?: string): WebAssembly.Instance {
    outputFile = outputFile || getDefaultOutputFile(sourcePath);
    clean(outputFile);
    const compileInfo = spawnSync(path.join(__dirname, '../../bin/tc'), [sourcePath, '--out', outputFile]);
    if (compileInfo.error) {
        let error = `Compiler Error! \n${compileInfo.error}`;
        Terminal.error(error);
        throw new Error(error);
    }
    else if (compileInfo.status > 0) {
        let error = `Compile Error! \n${compileInfo.stderr}\n${compileInfo.stdout}`;
        Terminal.error(error);
        throw new Error(error);
    }
    const data = fs.readFileSync(outputFile);
    const mod = new WebAssembly.Module(data);
    return new WebAssembly.Instance(mod, imports);
}

/**
 * Compile TurboScript to WebAssembly and asynchronous instantiate
 * @param sourcePath
 * @param imports
 * @param outputFile
 * @returns {Promise<Instance>}
 */
export async function getWasmInstance(sourcePath: string, imports: any = {}, outputFile?: string): Promise<WebAssembly.Instance> {
    outputFile = outputFile || getDefaultOutputFile(sourcePath);
    clean(outputFile);
    const compileInfo = spawnSync(path.join(__dirname, '../../bin/tc'), [sourcePath, '--out', outputFile]);
    if (compileInfo.error) {
        let error = `Compiler Error! \n${compileInfo.error}`;
        Terminal.error(error);
        throw new Error(error);
    }
    else if (compileInfo.status > 0) {
        let error = `Compile Error! \n${compileInfo.stderr}\n${compileInfo.stdout}`;
        Terminal.error(error);
        throw new Error(error);
    }
    const data = fs.readFileSync(outputFile);
    const result: WebAssembly.ResultObject = await WebAssembly.instantiate(data, imports);
    return result.instance;
}

/**
 * Compile TurboScript to WebAssembly and asynchronous instantiate
 * @param sourceString
 * @param imports
 * @param outputFile
 * @returns {Promise<Instance>}
 */
export async function getWasmInstanceFromString(sourceString: string, imports: any = {}, outputFile?: string): Promise<WebAssembly.Instance> {
    if (exports.turbo === undefined) {
        if (typeof global["TURBO_PATH"] === "undefined") {
            global["TURBO_PATH"] = "";
        }
        exports.turbo = require("../../lib/turbo.js");
    }
    let wasmBinary = exports.turbo.compileString(sourceString);
    if (wasmBinary === null) {
        let error = "Compile Error!";
        Terminal.error(error);
        throw new Error(error);
    }
    const result: WebAssembly.ResultObject = await WebAssembly.instantiate(wasmBinary.array, imports);
    return result.instance;
}

/**
 * Compile TurboScript to asm.js and asynchronous instantiate
 * @param sourcePath
 * @param imports
 * @param outputFile
 * @returns {Promise<Instance>}
 */
export async function getAsmjsInstance(sourcePath: string, imports: any = {}, outputFile?: string): Promise<{ exports: any }> {
    outputFile = outputFile || getDefaultOutputFile(sourcePath, "asm.js");
    clean(outputFile);
    const compileInfo = spawnSync(path.join(__dirname, '../../bin/tc'), [sourcePath, '--out', outputFile]);
    if (compileInfo.error) {
        let error = `Compiler Error! \n${compileInfo.error}`;
        Terminal.error(error);
        throw new Error(error);
    }
    else if (compileInfo.status > 0) {
        let error = `Compile Error! \n${compileInfo.stderr}\n${compileInfo.stdout}`;
        Terminal.error(error);
        throw new Error(error);
    }
    const TurboASM = require(outputFile).TurboASM;
    return TurboASM.Instance(0x10000);
}

/**
 * Clean old output file if exists
 * @param file
 */
function clean(file: string) {
    if (fs.existsSync(file)) {
        fs.unlinkSync(file);
    }
}

function getDefaultOutputFile(inputFile: string, target: string = "wasm"): string {
    const sep = path.sep;
    let fileName = inputFile.substring(inputFile.lastIndexOf(sep), inputFile.length);
    let folderName = inputFile.substring(0, inputFile.lastIndexOf(sep));
    return `${folderName}${sep}bin${sep}${fileName.replace(".tbs", "." + target)}`;
}
