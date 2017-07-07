package org.ballerinalang.composer.service.workspace.langserver.util.resolvers;

import org.ballerinalang.composer.service.workspace.langserver.SymbolInfo;
import org.ballerinalang.composer.service.workspace.langserver.dto.CompletionItem;
import org.ballerinalang.composer.service.workspace.suggetions.SuggestionsFilterDataModel;
import org.ballerinalang.util.parser.BallerinaParser;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

/**
 * Resolves all items that can appear as a top level element in the file.
 */
public class TopLevelResolver extends AbstractItemResolver {

    @Override
    public ArrayList<CompletionItem> resolveItems(SuggestionsFilterDataModel dataModel, ArrayList<SymbolInfo> symbols,
                                                  HashMap<Class, AbstractItemResolver> resolvers) {
        ArrayList<CompletionItem> completionItems = new ArrayList<>();
        addStaticItem(completionItems, ItemResolverConstants.IMPORT, ItemResolverConstants.IMPORT + " ");
        addStaticItem(completionItems, ItemResolverConstants.PACKAGE, ItemResolverConstants.PACKAGE + " ");
        addStaticItem(completionItems, ItemResolverConstants.FUNCTION, ItemResolverConstants.FUNCTION_TEMPLATE);
        addStaticItem(completionItems, ItemResolverConstants.SERVICE, ItemResolverConstants.SERVICE_TEMPLATE);
        addStaticItem(completionItems, ItemResolverConstants.CONNECTOR, ItemResolverConstants.CONNECTOR_TEMPLATE);
        addStaticItem(completionItems, ItemResolverConstants.STRUCT, ItemResolverConstants.STRUCT_TEMPLATE);
        addStaticItem(completionItems, ItemResolverConstants.ANNOTATION, ItemResolverConstants.ANNOTATION_TEMPLATE);

        // Add types
        completionItems.addAll(resolvers.get(BallerinaParser.ParameterContext.class)
                .resolveItems(dataModel, symbols , resolvers));

        return completionItems;
    }

    void addStaticItem(List<CompletionItem> completionItems, String label, String insertText) {
        CompletionItem item = new CompletionItem();
        item.setLabel(label);
        item.setInsertText(insertText);
        item.setDetail(ItemResolverConstants.KEYWORD_TYPE);
        item.setSortText(ItemResolverConstants.PRIORITY_4);
        completionItems.add(item);
    }
}
