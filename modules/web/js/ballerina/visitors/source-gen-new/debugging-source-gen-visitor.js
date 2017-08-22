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
            }
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
        for (let i = 0; i < props.length; i++) {
            const getterName = props[i];
            const getter = p[getterName];
            try {
                const got = getter.call(p);
                if (!_.isObject(got) || _.isPlainObject(got)) {
                    propVals.push([getterName, JSON.stringify(got)]);
                }
            } catch (e) {
                propVals.push([getterName, error, 'Error(' + JSON.stringify(e.name) + ')']);
            }
        }
        return _.sortBy(propVals, (l) => {
            if (l[1] === error) {
                return 1001;
            }
            return (l[1] === undefined ? 1000 : String(l[1]).length);
        }).map(o => o[0] + ' : ' + (o[1] === error ? o[2] : o[1])).join(', ');
    }


    logDebugInfo(visitedSource, node, color, listProps, l, visitType) {
        if (this.expected === undefined) {
            return;
        }
        const whiteSpaceDescriptor = node.getWhiteSpaceDescriptor();
        const regions = whiteSpaceDescriptor.regions;
        if (whiteSpaceDescriptor.children) {
            throw new Error('not impl');
        }
        let wsI = -1;
        let wsMatched = '';
        if (regions) {
            for (let i = 0; i < 20; i++) {
                const ws = regions[i];
                if (ws && (ws.indexOf('\t') >= 0 || ws.length > 10)) {
                    wsI = i;
                    wsMatched = ws;
                }
            }
        }

        const space = ' '.repeat(l);
        const indexOf = this.expected.indexOf(visitedSource, this.expectedPos);
        let visitedColor = color;
        if (indexOf >= 0) {
            this.expectedPos = indexOf + visitedSource.length;
        } else {
            visitedColor = color.bgBlack;
        }
        const props = listProps ? DebuggingSourceGenVisitor.objToStr(node) : '';
        const methodName = node.type + 'V.' + (_.isNumber(visitType) ? 'm(' + visitType : visitType + '(') + ')';
        if (visitedSource !== null) {
            const wsColor = (visitedSource.indexOf(wsMatched) < 0 ? chalk.white.bgRed : chalk.white.bgGreen);
            console.log(space,
                methodName,
                visitedColor(JSON.stringify(visitedSource)),
                wsI >= 0 ? wsColor(' ' + wsI + ' ') : '',
                chalk.black((props.length > 100) ? props.substring(0, 100) + '...' : props));
        } else {
            console.log(space, methodName, color.bold(listProps ? props : '-'));
        }
    }

    canVisit() {
        return true;
    }

    visit() {
    }

}

export default DebuggingSourceGenVisitor;

