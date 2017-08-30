/**
 * Copyright (c) 2016, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
 *
 * WSO2 Inc. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import log from 'log';
import chalk from 'chalk';
import chai from 'chai';
import Visitors from './components';
import ASTNode from './../../ast/node';

/**
 * Source generation for the Ballerina AST Root
 */
class DebuggingSourceGenVisitor {


    constructor(expected) {
        this.visitors = {};
        this.source = '';
        this.level = 0;
        this.expected = expected;
        this.expectedPos = -1;
        this.used = [];
    }


    /**
     *
     * @param {ASTNode} node
     */
    beginVisit(node) {
        const visitor = this.getVisitor(node.type);
        if (visitor) {
            const visitedSource = visitor.beginVisit(node);
            if (visitedSource !== null) {
                this.source += visitedSource;
                this.used.push(true);
            } else {
                this.used.push(false);
            }
            this.logDebugInfo(visitedSource, node, chalk.blue, true, this.level, 'b');
        }

        this.level++;
    }


    midVisit(node, i, l, r) {
        const visitor = this.getVisitor(node.type);
        if (visitor) {
            const visitedSource = visitor.midVisit(node, i, l, r);
            if (visitedSource !== null) {
                this.source += visitedSource;
                this.used.pop();
                this.used.push(true);
            } else {
                this.noMid = true;
            }
            this.logDebugInfo(visitedSource, node, chalk.green, false, this.level - 1, i);
        }
    }

    endVisit(node) {
        this.level--;

        const visitor = this.getVisitor(node.type);
        if (visitor) {
            const visitedSource = visitor.endVisit(node);
            if (visitedSource !== null) {
                this.source += visitedSource;
                this.used.pop();
                this.used.push(true);
            }
            // console.log(this.used.pop() ? '' : '>>> ' + node.type);
            this.logDebugInfo(visitedSource, node, chalk.magenta, false, this.level, 'e');
        }
    }

    getGeneratedSource() {
        return this.source;
    }


    setGeneratedSource(s) {
        this.source = s;
    }

    getVisitor(forType) {
        const name = forType + 'Visitor';
        let visitor = this.visitors[name];
        if (visitor === undefined) {
            const visitorConstructor = Visitors[name];
            chai.expect(Visitors).to.have.property(name);
            if (visitorConstructor) {
                visitor = new Visitors[name](this);
                this.visitors[name] = visitor;
            } else {
                log.error('Missing source gen visitor for ' + forType);
                this.visitors[name] = null;
            }
        }
        return visitor;
    }

    static objToStr(p) {
        let props = [];
        let obj = p;

        while (obj.constructor.name !== 'ASTNode') {
            props = props.concat(Object.getOwnPropertyNames(obj));
            obj = Object.getPrototypeOf(obj);
        }

        props = _.uniqBy(props.sort().filter((e) => {
            if (!e.startsWith('_') && _.isFunction(p[e]) && (e.match(/^(is|get|has)/))) return true;
        }));

        const propVals = [];

        const error = Symbol('Error');
        const node = Symbol('Node');
        const plain = Symbol('Plain');
        for (let i = 0; i < props.length; i++) {
            const getterName = props[i];
            const getter = p[getterName];
            try {
                const got = getter.call(p);
                if (!_.isObject(got) || _.isPlainObject(got)) {
                    propVals.push([getterName, plain, JSON.stringify(got)]);
                } else if (got instanceof ASTNode) {
                    propVals.push([getterName, node, got.type]);
                }
            } catch (e) {
                propVals.push([getterName, error, 'Error(' + JSON.stringify(e.name) + ')']);
            }
        }
        return _.sortBy(propVals, (l) => {
            if (l[1] === error) {
                return 1002;
            } else if (l[1] === node) {
                return 1001;
            }
            return (l[1] === undefined ? 1000 : String(l[1]).length);
        }).map(o => o[0] + ' : ' + o[2]).join(', ');
    }


    static findWS(whiteSpaceDescriptor, s = [], p = '') {
        const regions = whiteSpaceDescriptor.regions;
        if (regions) {
            for (let i = 0; i < 20; i++) {
                const ws = regions[i];
                if (ws && ws.length > 25) {
                    s.push([p + '[' + i + ']', i, ws]);
                }
            }
        }
        if (whiteSpaceDescriptor.children) {
            _.forEach(whiteSpaceDescriptor.children, (c, n) => {
                DebuggingSourceGenVisitor.findWS(c, s, p + '.' + n);
            });
        }
        return s;
    }

    lineNum(index) {
        let lines = 1;
        let chars = 1;
        for (let i = 0; i < index; i++) {
            const c = this.expected.charAt(i);
            if (c === '\n') {
                lines++;
                chars = 1;
            } else {
                chars++;
            }
        }
        return [lines, chars];
    }

    logDebugInfo(visitedSource, node, color, listProps, l, visitType) {
        // return;
        if (this.expected === undefined) {

        }
        const spaces = DebuggingSourceGenVisitor.findWS(node.getWhiteSpaceDescriptor());
        // if (spaces.length > 1) {
        //     throw new Error('no impel');
        // }
        const wsText = spaces.reduce((a, b) => a + (a === '' ? '' : ' or ') + b[0], '');
        // const wsText = spaces.length > 0 ? spaces[0][0] : '';

        const space = ' '.repeat(l);
        const indexOf = this.expected.indexOf(visitedSource, this.expectedPos);
        let line;
        let visitedColor = color;
        if (indexOf >= 0) {
            this.expectedPos = indexOf + visitedSource.length;
            line = chalk.gray(this.lineNum(indexOf));
        } else {
            const lastIndexOf = this.expected.lastIndexOf(visitedSource, this.expectedPos);
            if (lastIndexOf >= 0) {
                this.expectedPos = lastIndexOf + visitedSource.length;
                line = chalk.white(this.lineNum(lastIndexOf));
            } else {
                visitedColor = color.inverse;
                line = '';
            }
        }
        const props = listProps ? DebuggingSourceGenVisitor.objToStr(node) : '';
        const methodName = node.type + 'V.' + (_.isNumber(visitType) ? 'm(' + visitType : visitType + '(') + ')';
        if (!_.isNil(visitedSource)) {
            const w = process.stdout.columns - wsText.length - methodName.length - l - visitedSource.length - 15;
            const wsColor = (spaces.length > 0 && visitedSource.indexOf(spaces[0][2]) < 0 ?
                chalk.white.bgRed : chalk.white.bgGreen);
            console.log(space,
                methodName,
                visitedColor(JSON.stringify(visitedSource)),
                line,
                wsColor(wsText),
                chalk.black((props.length > w) ? props.substring(0, w) + '\u2026' : props));
        } else {
            console.log(space,
                methodName,
                color.bold(listProps ? props : '-'),
                chalk.white.bgYellow(wsText));
        }
    }

    canVisit() {
        return true;
    }

    visit() {
    }

}

export default DebuggingSourceGenVisitor;

