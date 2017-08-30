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

/* eslint no-unused-vars: ["error", { "args": "none" }] */

/**
 * Class for action invocation statement source generation.
 * @extends AbstractSourceGenVisitor
 */
class ActionInvocationStatementVisitor extends AbstractSourceGenVisitor {

    /**
     * Generate starting part of the action invocation statement.
     * @param { ActionInvocationStatement } node - node to be generated.
     * @return {string} generated source fragment.
     */
    beginVisit(node) {
        return null;
    }

    /**
     * Generate in-between children part of the parameter definition.
     * @param { ActionInvocationStatement } node - node to be generated.
     * @return {string} generated source fragment.
     */
    midVisit(node) {
        return null;
    }

    /**
     * Generate ending part of the parameter definition.
     * @param { ActionInvocationStatement } node - node to be generated.
     * @return {string} generated source fragment.
     */
    endVisit(node) {
        return node.s`; ${1}`;
    }

}

export default ActionInvocationStatementVisitor;
