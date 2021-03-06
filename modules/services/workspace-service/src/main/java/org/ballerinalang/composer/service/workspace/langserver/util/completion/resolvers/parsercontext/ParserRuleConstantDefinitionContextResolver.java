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

package org.ballerinalang.composer.service.workspace.langserver.util.completion.resolvers.parsercontext;

import org.ballerinalang.composer.service.workspace.langserver.SymbolInfo;
import org.ballerinalang.composer.service.workspace.langserver.dto.CompletionItem;
import org.ballerinalang.composer.service.workspace.langserver.util.completion.resolvers.AbstractItemResolver;
import org.ballerinalang.composer.service.workspace.langserver.util.completion.resolvers.ItemResolverConstants;
import org.ballerinalang.composer.service.workspace.suggetions.PossibleToken;
import org.ballerinalang.composer.service.workspace.suggetions.SuggestionsFilterDataModel;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

/**
 * constant definition context resolver for the completion items.
 */
public class ParserRuleConstantDefinitionContextResolver extends AbstractItemResolver {
    @Override
    public ArrayList<CompletionItem> resolveItems(SuggestionsFilterDataModel dataModel, ArrayList<SymbolInfo> symbols,
                                                  HashMap<Class, AbstractItemResolver> resolvers) {

        ArrayList<CompletionItem> completionItems = new ArrayList<>();

        List<PossibleToken> possibleTokenList = dataModel.getPossibleTokens();

        possibleTokenList.forEach(possibleToken -> {
            if (possibleToken.getTokenName().matches(".*[a-z].*")) {
                String tokenStr = possibleToken.getTokenName().replace("'", "");
                CompletionItem completionItem = new CompletionItem();
                completionItem.setLabel(tokenStr);
                completionItem.setInsertText(tokenStr);
                completionItem.setDetail(ItemResolverConstants.B_TYPE);
                completionItem.setSortText(ItemResolverConstants.PRIORITY_7);
                completionItems.add(completionItem);
            }
        });

        return completionItems;
    }
}
