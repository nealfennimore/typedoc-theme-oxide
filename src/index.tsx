/// <reference path="./jsx.d.ts" />

import * as fs from 'fs';
import * as path from 'path';
import { Application, Converter, RendererEvent, TypeScript } from 'typedoc';

import { OxideTheme } from './OxideTheme';


/**
 * Called by TypeDoc when loading this theme as a plugin. Should be used to define themes which
 * can be selected by the user.
 */
export function load(app: Application) {
    app.renderer.defineTheme("oxide", OxideTheme);

    app.listenToOnce(app.renderer, {
        [RendererEvent.END]: (event: RendererEvent) => {
            const src = path.join(__dirname, '..', 'assets');
            const dest = path.join(event.outputDirectory, 'assets', 'oxide');
            copySync(src, dest);
        },
    });

    const defaultValues = new Map();

    const printer = TypeScript.createPrinter({
        removeComments: true,
        omitTrailingSemicolon: true,
    });

    app.converter.on(
        Converter.EVENT_CREATE_DECLARATION,
        saveDefaultValues
    );
    app.converter.on(
        Converter.EVENT_CREATE_PARAMETER,
        saveDefaultValues
    );

    function saveDefaultValues(_context: any, reflection: any) {
        const node =
            reflection.project.getSymbolFromReflection(reflection)
                ?.declarations?.[0];

        if (!node || !node.initializer) return;

        // console.log("Kind", node.initializer.kind);

        switch (node.initializer.kind) {
            case TypeScript.SyntaxKind.ObjectLiteralExpression:
            case TypeScript.SyntaxKind.ArrayLiteralExpression:
            case TypeScript.SyntaxKind.NumericLiteral:
            case TypeScript.SyntaxKind.StringLiteral:
            case TypeScript.SyntaxKind.TrueKeyword:
            case TypeScript.SyntaxKind.FalseKeyword:
            case TypeScript.SyntaxKind.ArrowFunction:
            case TypeScript.SyntaxKind.FunctionExpression:
            case TypeScript.SyntaxKind.Identifier:
                defaultValues.set(
                    reflection,
                    printer.printNode(
                        TypeScript.EmitHint.Expression,
                        node.initializer,
                        node.getSourceFile()
                    )
                );
                break;
            default:
                break;
        }
    }

    app.converter.on(Converter.EVENT_RESOLVE_BEGIN, () => {
        for (const [refl, init] of defaultValues) {
            // console.log("init", init);
            refl.defaultValue = init;
        }
        // defaultValues.clear();
    });
}

// Copied from typedoc/src/lib/utils/fs.ts
export function copySync(src: string, dest: string): void {
    const stat = fs.statSync(src);

    if (stat.isDirectory()) {
        const contained = fs.readdirSync(src);
        contained.forEach((file) =>
            copySync(path.join(src, file), path.join(dest, file))
        );
    } else if (stat.isFile()) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
    } else {
        // Do nothing for FIFO, special devices.
    }
}
