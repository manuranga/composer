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
 * Class for service definition source generation.
 * @extends AbstractSourceGenVisitor
 */
class AnnotatedNodeVisitor extends AbstractSourceGenVisitor {

    /**
     * @param { ASTNode } node - node to be generated.
     * @return {string} generated source fragment.
     */
    beginAnnotatedBlock(node) {
        return null;
    }

    /**
     * @param { ASTNode } node - node to be generated.
     * @return {string} generated source fragment.
     */
    endAnnotatedBlock(node) {
        return null;
    }

    /**
     * Generate in-between children part of the parameter definition.
     * @param { ASTNode } node - node to be generated.
     * @param {number} i - index of the left child
     * @param {ASTNode} leftChild - the left child
     * @param {ASTNode} rightChild - the right child
     * @return {string} generated source fragment.
     */
    midVisitAfterAnnotation(node, i, leftChild, rightChild) {
        return null;
    }

    /**
     * Generate starting part of the service definition.
     * @param { ASTNode } node - node to be generated.
     * @return {string} generated source fragment.
     */
    beginVisit(node) {
        const children = node.getChildren();
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (ASTFactory.isConnectorDeclaration(child)) {
                // skip
            } else if (ASTFactory.isAnnotationAttachment(child)) {
                return null;
            } else {
                return this.beginAnnotatedBlock(node);
            }
        }

        return this.beginAnnotatedBlock(node);
    }

    /**
     * Generate in-between children part of the parameter definition.
     * @param { ASTNode } node - node to be generated.
     * @param {number} i - index of the left child
     * @param {ASTNode} leftChild - the left child
     * @param {ASTNode} rightChild - the right child
     * @return {string} generated source fragment.
     */
    midVisit(node, i, leftChild, rightChild) {
        if (ASTFactory.isAnnotationAttachment(leftChild)) {
            if (ASTFactory.isAnnotationAttachment(rightChild)) {
                return null;
            } else {
                return this.beginAnnotatedBlock(node);
            }
        }
        return this.midVisitAfterAnnotation(node, i, leftChild, rightChild);
    }


    /**
     * Generate ending part of the parameter definition.
     * @param { ServiceDefinition } node - node to be generated.
     * @return {string} generated source fragment.
     */
    endVisit(node) {
        const children = node.getChildren();
        const end = this.endAnnotatedBlock(node);
        if (children.length > 0 && ASTFactory.isAnnotationAttachment(children[children.length - 1])) {
            const begin = this.beginAnnotatedBlock(node);
            if (begin === null && end === null) {
                return null;
            }
            return (begin || '') + (end || '');
        } else {
            return end;
        }
    }

}

export default AnnotatedNodeVisitor;

