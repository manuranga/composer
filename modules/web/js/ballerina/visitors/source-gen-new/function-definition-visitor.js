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
import AnnotatedBlockVisitor from './annotated-node-visitor';
import ASTFactory from '../../ast/ast-factory.js';

/* eslint no-unused-vars: ["error", { "args": "none" }] */

/**
 * Class for function definition source generation.
 * @extends AbstractSourceGenVisitor
 */
class FunctionDefinitionVisitor extends AnnotatedBlockVisitor {

    /**
     * @param { ASTNode } node - node to be generated.
     * @return {string} generated source fragment.
     */
    beginAnnotatedBlock(node) {
        return node.s`function ${1} ${'getFunctionName'} ${2}`;
    }


    /**
     * Generate in-between children part of the parameter definition.
     * @param { FunctionDefinition } node - node to be generated.
     * @param {number} i - index of the left child
     * @param {ASTNode} leftChild - the left child
     * @param {ASTNode} rightChild - the right child
     * @return {string} generated source fragment.
     */
    midVisitAfterAnnotation(node, i, leftChild, rightChild) {
        if (ASTFactory.isReturnParameterDefinitionHolder(leftChild)) {
            return node.s`${6} { ${7}`;
        }
        return null;
        // switch (i) {
        //     case 0: // between ArgumentParameterDefinitionHolder ReturnParameterDefinitionHolder
        //         return node.s`${4}`;
        //     case 1: // after ReturnParameterDefinitionHolder
        //         return node.s`${6} { ${7}`;
        //     default:
        //         return null;
        // }
    }

    /**
     * Generate ending part of the parameter definition.
     * @param { FunctionDefinition } node - node to be generated.
     * @return {string} generated source fragment.
     */
    endVisit(node) {
        return node.s`} ${8}`;
    }

}

export default FunctionDefinitionVisitor;
