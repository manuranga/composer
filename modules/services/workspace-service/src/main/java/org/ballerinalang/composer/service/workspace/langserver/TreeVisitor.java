/*
*  Copyright (c) 2017, WSO2 Inc. (http://www.wso2.org) All Rights Reserved.
*
*  WSO2 Inc. licenses this file to you under the Apache License,
*  Version 2.0 (the "License"); you may not use this file except
*  in compliance with the License.
*  You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
*  Unless required by applicable law or agreed to in writing,
*  software distributed under the License is distributed on an
*  "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
*  KIND, either express or implied.  See the License for the
*  specific language governing permissions and limitations
*  under the License.
*/

package org.ballerinalang.composer.service.workspace.langserver;

import org.ballerinalang.composer.service.workspace.langserver.dto.Position;
import org.ballerinalang.composer.service.workspace.suggetions.SuggestionsFilterDataModel;
import org.ballerinalang.model.tree.Node;
import org.ballerinalang.model.tree.statements.StatementNode;
import org.ballerinalang.model.tree.types.BuiltInReferenceTypeNode;
import org.ballerinalang.model.types.TypeKind;
import org.wso2.ballerinalang.compiler.semantics.analyzer.SymbolEnter;
import org.wso2.ballerinalang.compiler.semantics.analyzer.SymbolResolver;
import org.wso2.ballerinalang.compiler.semantics.model.Scope;
import org.wso2.ballerinalang.compiler.semantics.model.SymbolEnv;
import org.wso2.ballerinalang.compiler.semantics.model.SymbolTable;
import org.wso2.ballerinalang.compiler.semantics.model.symbols.BPackageSymbol;
import org.wso2.ballerinalang.compiler.semantics.model.symbols.BSymbol;
import org.wso2.ballerinalang.compiler.semantics.model.symbols.Symbols;
import org.wso2.ballerinalang.compiler.tree.BLangAnnotation;
import org.wso2.ballerinalang.compiler.tree.BLangConnector;
import org.wso2.ballerinalang.compiler.tree.BLangFunction;
import org.wso2.ballerinalang.compiler.tree.BLangImportPackage;
import org.wso2.ballerinalang.compiler.tree.BLangNode;
import org.wso2.ballerinalang.compiler.tree.BLangNodeVisitor;
import org.wso2.ballerinalang.compiler.tree.BLangPackage;
import org.wso2.ballerinalang.compiler.tree.BLangService;
import org.wso2.ballerinalang.compiler.tree.BLangStruct;
import org.wso2.ballerinalang.compiler.tree.BLangVariable;
import org.wso2.ballerinalang.compiler.tree.BLangWorker;
import org.wso2.ballerinalang.compiler.tree.BLangXMLNS;
import org.wso2.ballerinalang.compiler.tree.expressions.BLangLiteral;
import org.wso2.ballerinalang.compiler.tree.expressions.BLangSimpleVarRef;
import org.wso2.ballerinalang.compiler.tree.statements.BLangAssignment;
import org.wso2.ballerinalang.compiler.tree.statements.BLangBlockStmt;
import org.wso2.ballerinalang.compiler.tree.statements.BLangCatch;
import org.wso2.ballerinalang.compiler.tree.statements.BLangContinue;
import org.wso2.ballerinalang.compiler.tree.statements.BLangExpressionStmt;
import org.wso2.ballerinalang.compiler.tree.statements.BLangForkJoin;
import org.wso2.ballerinalang.compiler.tree.statements.BLangIf;
import org.wso2.ballerinalang.compiler.tree.statements.BLangReturn;
import org.wso2.ballerinalang.compiler.tree.statements.BLangTryCatchFinally;
import org.wso2.ballerinalang.compiler.tree.statements.BLangVariableDef;
import org.wso2.ballerinalang.compiler.tree.statements.BLangWhile;
import org.wso2.ballerinalang.compiler.tree.statements.BLangWorkerReceive;
import org.wso2.ballerinalang.compiler.tree.statements.BLangWorkerSend;
import org.wso2.ballerinalang.compiler.tree.types.BLangType;
import org.wso2.ballerinalang.compiler.util.CompilerContext;
import org.wso2.ballerinalang.compiler.util.Name;
import org.wso2.ballerinalang.compiler.util.diagnotic.DiagnosticPos;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Stack;

/**
 * @since 0.94
 */
public class TreeVisitor extends BLangNodeVisitor {
    private SymbolEnv symbolEnv;
    private SymbolTable symTable;
    private SymbolResolver symbolResolver;
    private boolean terminateVisitor = false;
    private List<SymbolInfo> symbols;
    private Position position;
    private SuggestionsFilterDataModel filterDataModel;
    private SymbolEnter symbolEnter;
    private Stack<Node> blockOwnerStack;
    private Stack<BLangBlockStmt> blockStmtStack;

    public TreeVisitor(CompilerContext compilerContext, List<SymbolInfo> symbolInfoList, Position pos, SuggestionsFilterDataModel filterDataModel) {
        this.symTable = SymbolTable.getInstance(compilerContext);
        this.symbolEnter = SymbolEnter.getInstance(compilerContext);
        this.symbolResolver = SymbolResolver.getInstance(compilerContext);
        this.symbols = symbolInfoList;
        this.position = pos;
        this.filterDataModel = filterDataModel;
        blockOwnerStack = new Stack<>();
        blockStmtStack = new Stack<>();
    }

    // Visitor methods

    public void visit(BLangPackage pkgNode) {
        SymbolEnv pkgEnv = symbolEnter.packageEnvs.get(pkgNode.symbol);

        // Visit all the imported packages
        pkgNode.imports.forEach(importNode -> this.acceptNode(importNode, pkgEnv));

        // Then visit each top-level element sorted using the compilation unit
        pkgNode.topLevelNodes.forEach(topLevelNode -> this.acceptNode((BLangNode) topLevelNode, pkgEnv));
    }

    public void visit(BLangImportPackage importPkgNode) {
        BPackageSymbol pkgSymbol = importPkgNode.symbol;
        SymbolEnv pkgEnv = symbolEnter.packageEnvs.get(pkgSymbol);
        acceptNode(pkgEnv.node, pkgEnv);
    }

    public void visit(BLangXMLNS xmlnsNode) {
        throw new AssertionError();
    }

    public void visit(BLangFunction funcNode) {
        // Check for native functions
        BSymbol funcSymbol = funcNode.symbol;
        if (Symbols.isNative(funcSymbol)) {
            return;
        }
        SymbolEnv funcEnv = SymbolEnv.createFunctionEnv(funcNode, funcSymbol.scope, symbolEnv);

        this.blockOwnerStack.push(funcNode);
        this.acceptNode(funcNode.body, funcEnv);
        this.blockOwnerStack.pop();

        // Process   workers
        funcNode.workers.forEach(e -> this.symbolEnter.defineNode(e, funcEnv));
        funcNode.workers.forEach(e -> this.acceptNode(e, funcEnv));
    }

    public void visit(BLangStruct structNode) {
        BSymbol structSymbol = structNode.symbol;
        SymbolEnv structEnv = SymbolEnv.createPkgLevelSymbolEnv(structNode, structSymbol.scope, symbolEnv);
        structNode.fields.forEach(field -> this.acceptNode(field, structEnv));
    }

    public void visit(BLangAnnotation annotationNode) {
    }

    public void visit(BLangVariable varNode) {
        // TODO: Finalize
    }

    public void visit(BLangLiteral litNode) {
    }

    public void visit(BLangSimpleVarRef varRefExpr) {
    }


    // Statements

    public void visit(BLangBlockStmt blockNode) {
        SymbolEnv blockEnv = SymbolEnv.createBlockEnv(blockNode, symbolEnv);
        this.blockStmtStack.push(blockNode);
        blockNode.stmts.forEach(stmt -> this.acceptNode(stmt, blockEnv));
        this.blockStmtStack.pop();
    }

    public void visit(BLangVariableDef varDefNode) {
        if(!isCursorBeforeStatement(varDefNode.getPosition(), varDefNode)) {
            this.acceptNode(varDefNode.var, symbolEnv);
        }
    }

    public void visit(BLangAssignment assignNode) {
        isCursorBeforeStatement(assignNode.getPosition(), assignNode);
        // TODO: Finalize
    }

    public void visit(BLangExpressionStmt exprStmtNode) {
    }

    public void visit(BLangIf ifNode) {
        if (!isCursorBeforeStatement(ifNode.getPosition(), ifNode)) {
            this.acceptNode(ifNode.body, symbolEnv);

            if (ifNode.elseStmt != null) {
                // TODO: Finalize
                acceptNode(ifNode.elseStmt, symbolEnv);
            }
        }

    }

    public void visit(BLangWhile whileNode) {
        if (!isCursorBeforeStatement(whileNode.getPosition(), whileNode)) {

            this.blockOwnerStack.push(whileNode);
            this.acceptNode(whileNode.body, symbolEnv);
            this.blockOwnerStack.pop();
        }
    }

    public void visit(BLangConnector connectorNode) {
    }

    public void visit(BLangService serviceNode) {
    }

    public void visit(BLangTryCatchFinally tryCatchFinally) {
        if (!isCursorBeforeStatement(tryCatchFinally.getPosition(), tryCatchFinally)) {

            this.blockOwnerStack.push(tryCatchFinally);
            this.acceptNode(tryCatchFinally.tryBody, symbolEnv);
            this.blockOwnerStack.pop();

            tryCatchFinally.catchBlocks.forEach(c -> this.acceptNode(c, symbolEnv));
            if (tryCatchFinally.finallyBody != null) {
                // Check how we can add the blang node to stack
                this.acceptNode(tryCatchFinally.finallyBody, symbolEnv);
            }
        }
    }

    public void visit(BLangCatch bLangCatch) {
        if (!isCursorBeforeStatement(bLangCatch.getPosition(), bLangCatch)) {
            SymbolEnv catchBlockEnv = SymbolEnv.createBlockEnv(bLangCatch.body, symbolEnv);
            this.acceptNode(bLangCatch.param, catchBlockEnv);

            this.blockOwnerStack.push(bLangCatch);
            this.acceptNode(bLangCatch.body, catchBlockEnv);
            this.blockOwnerStack.pop();
        }
    }

    private boolean isJoinResultType(BLangVariable var) {
        BLangType type = var.typeNode;
        if (type instanceof BuiltInReferenceTypeNode) {
            return ((BuiltInReferenceTypeNode) type).getTypeKind() == TypeKind.MAP;
        }
        return false;
    }

    private BLangVariableDef createVarDef(BLangVariable var) {
        BLangVariableDef varDefNode = new BLangVariableDef();
        varDefNode.var = var;
        varDefNode.pos = var.pos;
        return varDefNode;
    }

    private BLangBlockStmt generateCodeBlock(StatementNode... statements) {
        BLangBlockStmt block = new BLangBlockStmt();
        for (StatementNode stmt : statements) {
            block.addStatement(stmt);
        }
        return block;
    }

    @Override
    public void visit(BLangForkJoin forkJoin) {
        SymbolEnv folkJoinEnv = SymbolEnv.createFolkJoinEnv(forkJoin, this.symbolEnv);
        // TODO: check the symbolEnter.defineNode
        forkJoin.workers.forEach(e -> this.symbolEnter.defineNode(e, folkJoinEnv));
        forkJoin.workers.forEach(e -> this.acceptNode(e, folkJoinEnv));
//        if (!this.isJoinResultType(forkJoin.joinResultVar)) {
//            this.dlog.error(forkJoin.joinResultVar.pos, DiagnosticCode.INVALID_WORKER_JOIN_RESULT_TYPE);
//        }
        /* create code black and environment for join result section, i.e. (map results) */
        BLangBlockStmt joinResultsBlock = this.generateCodeBlock(this.createVarDef(forkJoin.joinResultVar));
        SymbolEnv joinResultsEnv = SymbolEnv.createBlockEnv(joinResultsBlock, this.symbolEnv);
        this.acceptNode(joinResultsBlock, joinResultsEnv);
        /* create an environment for the join body, making the enclosing environment the earlier
         * join result's environment */
        SymbolEnv joinBodyEnv = SymbolEnv.createBlockEnv(forkJoin.joinedBody, joinResultsEnv);
        this.acceptNode(forkJoin.joinedBody, joinBodyEnv);

        if (forkJoin.timeoutExpression != null) {
            /* create code black and environment for timeout section */
            BLangBlockStmt timeoutVarBlock = this.generateCodeBlock(this.createVarDef(forkJoin.timeoutVariable));
            SymbolEnv timeoutVarEnv = SymbolEnv.createBlockEnv(timeoutVarBlock, this.symbolEnv);
            this.acceptNode(timeoutVarBlock, timeoutVarEnv);
            /* create an environment for the timeout body, making the enclosing environment the earlier
             * timeout var's environment */
            SymbolEnv timeoutBodyEnv = SymbolEnv.createBlockEnv(forkJoin.timeoutBody, timeoutVarEnv);
            this.acceptNode(forkJoin.timeoutBody, timeoutBodyEnv);
        }
    }

    @Override
    public void visit(BLangWorker workerNode) {
        SymbolEnv workerEnv = SymbolEnv.createWorkerEnv(workerNode, this.symbolEnv);
        this.acceptNode(workerNode.body, workerEnv);
    }

    @Override
    public void visit(BLangWorkerSend workerSendNode) {
        isCursorBeforeStatement(workerSendNode.getPosition(), workerSendNode);
    }

    @Override
    public void visit(BLangWorkerReceive workerReceiveNode) {
        isCursorBeforeStatement(workerReceiveNode.getPosition(), workerReceiveNode);
    }

    @Override
    public void visit(BLangReturn returnNode) {
        isCursorBeforeStatement(returnNode.getPosition(), returnNode);
    }

    public void visit(BLangContinue continueNode) {
        isCursorBeforeStatement(continueNode.getPosition(), continueNode);
        /* ignore */
    }

    // Private methods

    /**
     * Resolve all visible symbols
     * @param symbolEnv symbol environment
     * @return all visible symbols for current scope
     */
    private Map<Name, Scope.ScopeEntry> resolveAllVisibleSymbols(SymbolEnv symbolEnv) {
//        Map<Name, Scope.ScopeEntry> visibleSymbolEntries = symbolResolver.lookupAllVisibleSymbols(symbolEnv);
//        System.out.println(visibleSymbolEntries);
//        return  visibleSymbolEntries;
        return null;
    }

    /**
     * Populate the symbols
     * @param symbolEntries symbol entries
     */
    private void populateSymbols(Map<Name, Scope.ScopeEntry> symbolEntries) {
        this.filterDataModel.setSymbolEnvNode(this.symbolEnv.node);
        symbolEntries.forEach((k, v) -> {
            SymbolInfo symbolInfo = new SymbolInfo(k.getValue(), v);
            symbols.add(symbolInfo);
        });
    }

    /**
     * Get the symbol table
     * @return current symbol table
     */
    SymbolTable getSymTable() {
        return this.symTable;
    }

    private void acceptNode(BLangNode node, SymbolEnv env) {

        if (this.terminateVisitor) {
            return;
        }

        SymbolEnv prevEnv = this.symbolEnv;
        this.symbolEnv = env;
        node.accept(this);
        this.symbolEnv = prevEnv;
    }

    private boolean isCursorBeforeStatement(DiagnosticPos nodePosition, Node node) {
        int line = position.getLine();
        int col = position.getCharacter();
        int nodeSLine = nodePosition.sLine;
        int nodeSCol = nodePosition.sCol;
        int nodeELine = nodePosition.eLine;
        int nodeECol = nodePosition.eCol;
        BLangBlockStmt bLangBlockStmt = this.blockStmtStack.peek();
        Node blockOwner = this.blockOwnerStack.peek();
        int blockOwnerELine = blockOwner.getPosition().getEndLine();
        int blockOwnerECol = blockOwner.getPosition().endColumn();

        boolean isLastStatement = (bLangBlockStmt.stmts.indexOf(node) == (bLangBlockStmt.stmts.size() - 1));

        if (line < nodeSLine || (line == nodeSLine && col < nodeSCol) ||
                (isLastStatement && (line < blockOwnerELine || (line == blockOwnerELine && col < blockOwnerECol)) &&
                        (line > nodeELine || (line == nodeELine && col > nodeECol)))) {
            Map<Name, Scope.ScopeEntry> visibleSymbolEntries = this.resolveAllVisibleSymbols(symbolEnv);
            System.out.println(Collections.singletonList(visibleSymbolEntries));
            this.populateSymbols(visibleSymbolEntries);
            this.terminateVisitor = true;
            return true;
        }

        return false;
    }
}