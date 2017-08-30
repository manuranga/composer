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
import AbstractSourceGenVisitor from './abstract-source-gen-visitor';
import ASTFactory from '../../ast/ast-factory.js';
/* eslint no-unused-vars: ["error", { "args": "none" }] */

/**
 * Class for argument parameter definition holder source generation.
 * @extends AbstractSourceGenVisitor
 */
class ArgumentParameterDefinitionHolderVisitor extends AbstractSourceGenVisitor {

    /**
     * Generate starting part of the argument parameter definition holder.
     * @param { ArgumentParameterDefinitionHolder } node - node to be generated.
     * @return {string} generated source fragment.
     */
    beginVisit(node) {
        const parent = node.parent;
        if (ASTFactory.isResourceDefinition(parent)) {
            return '(' + parent.s`${2}`;
        } else {
            return '(' + parent.s`${3}`;
        }
    }

    /**
     * Generate in-between children part of the parameter definition.
     * @param { ArgumentParameterDefinitionHolder } node - node to be generated.
     * @param {number} i - index of the left child
     * @param {ASTNode} l - the left child
     * @param {ASTNode} r - the right child
     * @return {string} generated source fragment.
     */
    midVisit(node, i, l, r) {
        return ',' + r.s`${0}`;
    }

    /**
     * Generate ending part of the parameter definition.
     * @param { ArgumentParameterDefinitionHolder } node - node to be generated.
     * @return {string} generated source fragment.
     */
    endVisit(node) {
        return ')';
    }

}

export default ArgumentParameterDefinitionHolderVisitor;
