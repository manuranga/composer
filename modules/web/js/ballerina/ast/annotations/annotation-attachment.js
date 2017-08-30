/**
 * Copyright (c) 2017, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
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
import ASTNode from '../node';
import ASTFactory from '../ast-factory.js';

const supportedHttpMethodAnnotations = ['POST', 'GET', 'PUT', 'HEAD', 'DELETE', 'PATCH', 'OPTION'];

/**
 * AST for an annotation attachment.
 *
 * @class AnnotationAttachment
 * @extends {ASTNode}
 */
class AnnotationAttachment extends ASTNode {
    /**
     * Creates new instance of an annotation attachment.
     * @param {object} args The annotation creation args object.
     * @param {string} args.fullPackageName The full package name of the annotation. Example: ballerina.net.http.
     * @param {string} args.packageName The full package name of the annotation. Example: http.
     * @param {string} args.name The right hand side test of the annotation. Example: GET
     */
    constructor(args) {
        super('AnnotationAttachment');

        /**
         * The full package name. Example: ballerina.net.http.
         * @type {string}
         */
        this._fullPackageName = _.get(args, 'fullPackageName');

        /**
         * The package of the annotation. Example: http.
         * @type {string}
         */
        this._packageName = _.get(args, 'packageName');

        /**
         * The identifier/annotation name for the annotation without @ sign. Example: GET.
         * @type {string}
         */
        this._name = _.get(args, 'name');

        this._isHttpMethod = false;
        this.setIsHttpMethod();

        this.whiteSpace.defaultDescriptor.regions = {
            0: '',      // space before '@' char
            1: ' ',     // space after the name of annotation
            2: '\n',    // space between first '{' and first attribute.
            3: '\n',    // space after '}' bracket.
        };
    }

    // eslint-disable-next-line require-jsdoc
    setFullPackageName(fullPackageName, options) {
        this.setAttribute('_fullPackageName', fullPackageName, options);
    }

    // eslint-disable-next-line require-jsdoc
    getFullPackageName() {
        return this._fullPackageName;
    }

    // eslint-disable-next-line require-jsdoc
    setPackageName(packageName, options) {
        this.setAttribute('_packageName', packageName, options);
    }

    hasPackageName() {
        return !_.isNil(this._packageName);
    }

    // eslint-disable-next-line require-jsdoc
    getPackageName() {
        return this._packageName;
    }

    // eslint-disable-next-line require-jsdoc
    setName(name, options) {
        this.setAttribute('_name', name, options);
    }

    // eslint-disable-next-line require-jsdoc
    getName() {
        return this._name;
    }

    /**
     * Checks if the annotation attachment an http method.
     *
     * @returns {boolean} true if http method annotation, else false.
     * @memberof AnnotationAttachment
     */
    isHttpMethod() {
        return this._isHttpMethod;
    }

    setIsHttpMethod() {
        if (this._name && _.includes(
            _.map(supportedHttpMethodAnnotations, (e) => { return e.toLowerCase(); }), this.getName().toLowerCase())) {
            this._isHttpMethod = true;
        } else {
            this._isHttpMethod = false;
        }
    }

    /**
     * Setting parameters from json
     * @param {object} jsonNode Json object for initializing an attachment.
     * @param {string} jsonNode.annotation_attachment_full_package_name The full path of the annotation.
     * @param {string} jsonNode.annotation_attachment_package_name The package name.
     * @param {string} jsonNode.annotation_attachment_name The name of the annotation.
     */
    initFromJson(jsonNode) {
        this.setFullPackageName(jsonNode.annotation_attachment_full_package_name, { doSilently: true });
        if (jsonNode.annotation_attachment_package_name !== undefined &&
                                                                jsonNode.annotation_attachment_package_name !== null) {
            this.setPackageName(jsonNode.annotation_attachment_package_name, { doSilently: true });
        }
        if (jsonNode.annotation_attachment_name === 'undefined') {
            this.setName(undefined, { doSilently: true });
        } else {
            this.setName(jsonNode.annotation_attachment_name, { doSilently: true });
        }

        this.setIsHttpMethod();

        jsonNode.children.forEach((childNode) => {
            const child = ASTFactory.createFromJson(childNode);
            this.addChild(child);
            child.initFromJson(childNode);
        });
    }
}

export default AnnotationAttachment;
