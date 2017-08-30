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
 * Class for resource definition source generation.
 * @extends AbstractSourceGenVisitor
 */
class ResourceDefinitionVisitor extends AnnotatedBlockVisitor {

    /**
     * Generate starting part of the resource definition.
     * @param { ResourceDefinition } node - node to be generated.
     * @return {string} generated source fragment.
     */
    beginAnnotatedBlock(node) {
        return node.s`resource ${0} ${'getResourceName'} ${1}`;
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
        if (ASTFactory.isArgumentParameterDefinitionHolder(leftChild)) {
            return node.s`${3} { ${4}`;
        }
        return null;
    }

    /**
     * Generate ending part of the parameter definition.
     * @param { ResourceDefinition } node - node to be generated.
     * @return {string} generated source fragment.
     */
    endAnnotatedBlock(node) {
        return node.s`} ${5}`;
    }

}

export default ResourceDefinitionVisitor;
