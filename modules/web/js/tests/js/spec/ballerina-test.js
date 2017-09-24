/**
 * Copyright (c) 2017, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the 'License'); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
/* eslint-env es6 */
/* global it */
/* global after */
/* global before */

import { fetchConfigs, parseContent } from "api-client/api-client";
import fs from "fs";
import { expect } from "chai";
import processNode from "./white-space-test";
import _ from "lodash";
import path from "path";
import chalk from "chalk";
import TreeBuilder from "../../../ballerina/model/tree-builder";
import Node from "../../../ballerina/model/tree/node";

const directory = process.env.DIRECTORY ? process.env.DIRECTORY : '';

function readFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}
function indent(str, p, pad) {
    let last = 0;
    return str.replace(new RegExp(_.escapeRegExp(p), 'g'), function (m, offset) {
        if (offset - last > 40) {
            last = offset;
            return p + '\n' + pad;
        } else {
            return p;
        }
    });
}

function ruleToJs(rule) {
    const js = [];
    for (let i = 0; i < rule.length; i++) {
        const p = rule[i];
        switch (p.type) {
            case 'node':
                js.push('node.' + p.getter + '.getSource()');
                break;
            case 'identifier':
                js.push('node.' + p.getter + '.value + w()');
                break;
            case 'flag':
                js.push('\'' + p.getter + '\' + w()');
                break;
            case 'sugar':
                js.push('\'' + p.sugar + '\' + w()');
                break;
            case 'value':
                js.push('node.' + p.getter + ' + w()');
                break;
            case 'node-list':
                js.push('Node.join(node.' + p.getter + ', w, \'' + ( p.delemter || p.suffix || '') + '\'' + ( p.suffix ? ', true' : '') + ')');
                break;
            case undefined:
                js.push('\'' + p.text + '\' + w()');
                break;
            default:
                js.push(p.getter + '<' + p.type + '>');
                break;
        }
    }
    return js.join(' + ');
}

const promisers = {};
function debugPrint(node, name = '', l = 1) {
    const wsStr = (node.ws || []).map(ws =>
    String(ws.i)
        .split('')
        .map(i => ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'][Number(i)])
        .join('') + ws.text).join(' ');

    console.log(new Array(l).join(' '),
        chalk.green(name),
        chalk.blue(node.kind),
        node.entries().map(([key, val]) => {
                let valPritty = val;
                if (val === true) {
                    valPritty = '\u2713';
                } else if (val === false) {
                    return chalk.green.dim.strikethrough(key);
                }
                return chalk.green(key) + ':' + chalk.cyan(_.isObject(valPritty) ? JSON.stringify(valPritty) : valPritty);
            },
        ).join(),
        wsStr);
    for (const [childName, child] of node) {
        debugPrint(child, childName, l + 2);
    }
}

// Ballerina AST Deserializer
function ballerinaASTDeserializer(filePath) {
    let cached = promisers[filePath];
    if (!cached) {
        const fileContent = readFile(filePath);
        cached = new Promise((resolve, reject) => {
            parseContent(fileContent)
                .then((parsedJson) => {
                    // console.log(JSON.stringify(parsedJson,
                    //     (key, val) => {
                    //         if (key === 'ws') {
                    //             return val.map(ws =>
                    //             String(ws.i)
                    //                 .split('')
                    //                 .map(i => ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'][Number(i)])
                    //                 .join('') + ws.text).join(' ');
                    //         }
                    //         if (key === 'position') {
                    //             return val.startLine + ':' + val.startColumn +
                    //                 '-' + val.endLine + ':' + val.endColumn;
                    //         }
                    //         return val;
                    //     }, ' ')
                    //     .replace(/"kind": "([a-zA-Z]*)"/g, '"kind": ' + chalk.green('$1'))
                    //     .replace(/"ws": "(.*)"/g, chalk.gray('"ws": "$1"'))
                    //     .replace(/"position": "(.*)"/g, chalk.black('"position": "$1"'))
                    //     .replace(/"([a-zA-Z]*)": \[\]/g, chalk.gray('"$1": []'))
                    //     .replace(/"([a-zA-Z]*)": false/g, chalk.black('"$1": false')));

                    // console.log(JSON.stringify(parsedJson, null, '    '));
                    const tree = TreeBuilder.build(parsedJson);
                    if (process.env.SOURCE_DEBUG === 'true') {
                        debugPrint(tree);
                    }
                    // const ASTModel = BallerinaASTDeserializer.getASTModel(parsedJson);
                    // const sourceGenVisitor = new BallerinaASTRootVisitor();
                    // ASTModel.accept(sourceGenVisitor);
                    resolve({ tree, fileContent, generatedSource: tree.getSource() });
                })
                .catch(reject);
        });
        promisers[filePath] = cached;
    }
    return cached;
}

// List all files in a directory in Node.js recursively in a synchronous fashion
function findBalFilesInDirSync(dir, filelist) {
    const files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach((file) => {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            filelist = findBalFilesInDirSync(path.join(dir, file), filelist);
        } else if (path.extname(file) === '.bal') {
            filelist.push(path.join(dir, file));
        }
    });
    return filelist;
}

function accumulateWS(node) {
    const accumulatedWS = [];
    if (node.ws) {
        accumulatedWS.push(...node.ws);
    }
    for (const propName of Object.keys(node)) {
        if (propName !== 'ws' && propName !== 'parent') {
            const prop = node[propName];
            if (prop instanceof Node) {
                accumulateWS(prop);
                accumulatedWS.push(...prop.accumulatedWS);
            } else if (_.isArray(prop)) {
                for (let i = 0; i < prop.length; i++) {
                    const propItem = prop[i];
                    accumulateWS(propItem);
                    accumulatedWS.push(...propItem.accumulatedWS);
                }
            }
        }
    }
    node.accumulatedWS = _.sortBy(accumulatedWS, 'i');
}


/* global describe */
// Reference : https://stackoverflow.com/a/39158329/1403246
describe('Ballerina Composer Test Suite', () => {
    const rules = [];
    const noSamples = {};

    // fetch configs before proceeding
    before((beforeAllDone) => {
        fetchConfigs()
            .then(() => beforeAllDone())
            .catch(beforeAllDone);
    });
    const testResDir = path.resolve(path.join(directory, 'js', 'tests', 'resources', 'parser'));
    const testFiles = findBalFilesInDirSync(testResDir);
    _.sortBy(testFiles, f => fs.statSync(f).size).slice(0, 500).forEach((testFile) => {
        const relPath = path.relative('.', testFile);
        it(relPath + ' parse', (done) => {
            ballerinaASTDeserializer(testFile)
                .then(({ tree }) => {
                    if (tree.topLevelNodes) {
                        done();
                    } else {
                        done(new Error('no comp'));
                    }
                })
                .catch((error) => {
                    done(error);
                });
        });
        it(relPath + ' white space captured', (done) => {
            ballerinaASTDeserializer(testFile)
                .then(({ tree }) => {
                    let err = '';
                    accumulateWS(tree);
                    if (!tree.topLevelNodes) {
                        done(new Error('No top level nodes'));
                        return;
                    }
                    const toCheck = [...tree.topLevelNodes];
                    while (toCheck.length > 0) {
                        err += processNode(toCheck, rules, noSamples);
                    }
                    if (err.length > 0) {
                        done(new Error(err));
                    } else {
                        done();
                    }
                })
                .catch((error) => {
                    done(error);
                });
        });
        it(relPath + ' file serialize/deserialize test', (done) => {
            ballerinaASTDeserializer(testFile)
                .then(({ generatedSource, fileContent }) => {
                    if (process.env.IGNORE_WS === 'true') {
                        expect(generatedSource.replace(/\s/g, '').replace(/(;|{|})/g, '$1\n'))
                            .to.equal(fileContent.replace(/\s/g, '').replace(/(;|{|})/g, '$1\n'));
                    } else {
                        expect(generatedSource).to.equal(fileContent);
                    }
                    done();
                })
                .catch((error) => {
                    done(error);
                });
        });
    });
    function pritfyRule(rule) {
        const lit = chalk.blue.bold;
        return rule.map(p => {
            if (p.getter) {
                if (p.suffix) {
                    return '( \u226A' + p.getter + '\u226B ' + lit(p.suffix) + ' )*';
                }
                if (p.delemter) {
                    // return '( ( \u226A' + p.getter + '\u226B ' + lit(p.delemter) + ' )+ \u226A' + p.getter + '\u226B )?';
                    return '\u226A' + p.getter + lit(p.delemter) + '\u226B*';
                }
                return '\u226A' + p.getter + '\u226B' + (p.type === 'node-list' ? '*' : '');
            }
            return lit(p.text);
        }).join(' ');
    }

    after((a) => {
        // const rulesSet = _.sortedUniq(rules.sort());
        rules.forEach(({ rule }) => {
            rule.forEach((p) => {
                if (p.getter) {
                    delete p.text;
                    delete p.i;
                } else {
                    delete p.i;
                    delete p.ws;
                    delete p.static;
                }
            });
        });
        const rulesPerKind = _.groupBy(rules, 'kind');
        for (const kind in rulesPerKind) {
            // const map = _.groupBy(rulesPerKind[kind].map(r => r.rule));
            console.log(kind);
            // const rules = rulesPerKind[kind];
            const byFreq = _.map(_.groupBy(rulesPerKind[kind], JSON.stringify), (v, k) => ({ k, fq: v.length }));
            const prittyRules = _.uniqBy(_.orderBy(byFreq, 'fq', ['desc']).map(e => JSON.parse(e.k)), (e => e.rule.filter(r => r.getter).map(r => r.getter).join()))
                .map(e => pritfyRule(e.rule));
            console.log('   : ' + prittyRules.join('\n   | ') + '\n   ;');
            console.log();
        }

        for (const kind in rulesPerKind) {
            console.log(`case '${kind}':`);
            const byFreq = _.map(_.groupBy(rulesPerKind[kind], JSON.stringify), (v, k) => ({ k, fq: v.length }))
                .map(e => {
                    e.rule = JSON.parse(e.k).rule;
                    delete e.k;
                    return e;
                });

            byFreq.forEach(r => r.delemterCount = r.rule.filter(p => p.delemter).length);

            const rules = _.uniqBy(_.orderBy(byFreq, ['delemterCount', 'fq'], ['desc', 'desc']),
                (e => e.rule.filter(r => r.getter).map(r => r.getter).join()));

            if (rules.length > 1) {
                const rulesWitGetters = _.uniqBy(rules.map(o => o.rule), JSON.stringify)
                    .map(rule => ({ rule, getters: rule.filter(r => r.getter) }));


                const rulesWitGettersFromLongest = _.orderBy(rulesWitGetters, 'getters.length', ['desc']);
                for (let i = 0; i < rulesWitGettersFromLongest.length; i++) {
                    const ruleWithGetters = rulesWitGettersFromLongest[i];
                    if (i === rulesWitGettersFromLongest.length - 1) {
                        console.log('   else{');
                    } else {
                        console.log('   if (' + indent(ruleWithGetters.getters.map(
                                s => 'node.' + s.getter + (s.type === 'identifier' ? '.value' : '')
                                + (s.type === 'node-list' ? ' && node.' + s.getter + '.length' : '')
                            ).join(' && '), '&&', '        ') + '){');

                    }
                    if (ruleWithGetters.rule.length === 0) {
                        console.log('       return \'\';');
                    }
                    const join = indent(ruleToJs(ruleWithGetters.rule), ' + ', '          ');
                    console.log('       return ' + join + ';');
                    console.log('   }');
                }
            } else {

                console.log('   return ' + indent(ruleToJs(rules[0].rule), ' + ', '          ') + ';');
            }
        }
        for (const hasSampleOf in noSamples) {
            if (noSamples[hasSampleOf]) {
                console.log('No sample for ' + hasSampleOf);
            }
        }
        a();
    });
});

