/// <reference path="../lib/types.d.ts" />

import utils = require('../lib/utils');
import FileUtil = require('../lib/FileUtil');
import path = require('path');
import * as Compiler from '../actions/Compiler';
import * as Server from '../server/server';
import watch = require("../lib/watch");

class TypeScriptProject {

    private compilerOptions: ts.CompilerOptions;

    constructor(private projectDir) {

    }

    public compile(files?: egret.FileChanges) {
        if (files && this.compilerHost) {
            // files.forEach(f => f.fileName = f.fileName.replace(args.projectDir, ""));
            // var realCWD = process.cwd();
            // process.chdir(args.projectDir);
            this.compilerHost = this.compilerHost.compileWithChanges(files, false);
            // process.chdir(realCWD);
        }
        else {
            var compiler = new Compiler.Compiler();
            let configParsedResult = compiler.parseTsconfig(this.projectDir, egret.args.publish);
            this.compilerOptions = configParsedResult.options;
            let fileNames = configParsedResult.fileNames;
            let tsconfigError = configParsedResult.errors.map(d => d.messageText.toString());
            this.compilerOptions.outDir = path.join(this.projectDir, "bin-debug");
            // this.compilerOptions.outFile = path.join(args.releaseDir, "main.min.js");
            // this.compilerOptions.sourceMap = true;//引擎命令行的sourcemap属性优先
            this.compilerOptions.allowUnreachableCode = true;
            this.compilerOptions.emitReflection = true;
            this.compilerHost = compiler.compile(this.compilerOptions, fileNames);
        }
        let relative = f => path.relative(this.projectDir, f)

        // var fileResult = GetJavaScriptFileNames(this.compilerHost.files.map(relative), /^src\//)
        // this.compilerHost.files = fileResult;

        if (this.compilerHost.messages.length > 0) {
            this.compilerHost.exitStatus = 1303;
        }

        return this.compilerHost;

    }

    private compilerHost: Compiler.EgretCompilerHost;
}

function GetJavaScriptFileNames(tsFiles: string[], root: string | RegExp, prefix?: string) {
    var files: string[] = [];
    tsFiles.forEach(f => {
        if (!f)
            return;
        if (/\.d\.ts$/.test(f))
            return;
        f = FileUtil.escapePath(f);
        f = f.replace(<any>root, '').replace(/\.ts$/, '.js').replace(/^\//, '');
        if (prefix) {
            f = prefix + f;
        }
        files.push(f);
    });
    return files;
}
let compileChanged = (fileName: string, type: string) => {
    if (fileName.indexOf(".ts") >= 0) {
        let fileChanged = { fileName, type };
        console.log(fileChanged)
        console.log("tsc begin")
        host.compileWithChanges([fileChanged]);
        console.log(host.messages)
        console.log("tsc end")
    }

}

let host: Compiler.EgretCompilerHost;

export function run(root: string) {
    watch.createMonitor(root, { persistent: true, interval: 2007, filter: (f, stat) => !f.match(/\.g(\.d)?\.ts/) }, m => {
        m.on("created", (f) => compileChanged(f, "added"))
            .on("removed", (f) => compileChanged(f, "removed"))
            .on("changed", (f) => compileChanged(f, "modified"));
    });
    let project = new TypeScriptProject(root);
    console.log("tsc begin")
    host = project.compile();
    console.log(host.messages)
    console.log("tsc end")
}

export var middleware: Server.Middleware = () => {


    return async (request, response) => {
        response.end(host.messages.toString())
    }



}




