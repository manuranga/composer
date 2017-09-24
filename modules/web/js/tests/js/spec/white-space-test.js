import Node from "../../../ballerina/model/tree/node";

const nodeInternalProps = ['ws', 'parent', 'accumulatedWS', 'viewState', 'id', '_events'];

function processNode(toCheck, rules, alwaysEmpty) {
    let err = '';
    const node = toCheck.pop();
    if (!node.ws) {
        node.ws = [];
    }
    const tokens = node.ws ? node.ws.map(ws => ws.text) : [];
    const providers = [];
    for (const propName of Object.keys(node)) {
        const prop = node[propName];
        if (!_.includes(nodeInternalProps, propName)) {
            if (prop.kind === 'Identifier') {
                providers.push({ text: [prop.value], getter: propName, type: 'identifier' });
            } else if (prop instanceof Node) {
                toCheck.push(prop);
                providers.push({
                    text: [],
                    i: prop.accumulatedWS.length > 0 ? prop.accumulatedWS[0].i : -2,
                    getter: propName,
                    type: 'node',
                });
            } else if (_.isArray(prop)) {
                const provides = [];
                for (let i = 0; i < prop.length; i++) {
                    const propI = prop[i];
                    if (propI.kind === 'Identifier') {
                        provides.push(propI.value);
                    } else if (propI instanceof Node) {
                        toCheck.push(propI);
                    }
                }
                if (provides.length > 0) {
                    providers.push({ text: provides, getter: propName, type: 'identifier-list' });
                } else {
                    const i = prop.length > 0 && prop[0].accumulatedWS.length > 0 ? prop[0].accumulatedWS[0].i : -3;
                    providers.push({
                        text: [],
                        i,
                        getter: propName,
                        type: 'node-list',
                    });
                }
            } else if (propName !== 'position' && propName !== 'kind') {
                if (_.includes(['public', 'native', 'const', 'parallel'], propName)) {
                    if (prop === true) {
                        providers.push({
                            text: [propName],
                            getter: propName,
                            type: 'flag',
                        });
                    }
                } else if (propName === 'declaredWithVar') {
                    if (prop === true) {
                        providers.push({
                            text: ['var'],
                            getter: propName,
                            sugar: 'var',
                            type: 'sugar',
                        });
                    }
                } else if (propName === 'dimensions' && _.isNumber(prop)) {
                    providers.push({
                        text: ['[', ']'],
                        getter: propName,
                        type: 'dimensions',
                    });
                } else if (!_.isBoolean(prop)) {
                    providers.push({
                        text: [String(prop)],
                        getter: propName,
                        type: 'value',
                    });
                } else if (propName !== 'lambda') {
                    // providers.push({
                    //     text: [String(prop)],
                    //     getter: propName,
                    //     type: 'bool',
                    // });
                }
            }
        }
    }
    const approvedProviders = [];
    debugger;
    for (let i = 0; i < providers.length; i++) {
        const provider = providers[i];
        if (provider.text.join('') !== '') {
            const noWSFor = _.difference(provider.text, tokens);
            if (noWSFor.length > 0) {
                console.log('rejected (no ws) ' + node.kind + JSON.stringify(provider));
                err += '\nWS not captured for ' + provider.getter + ' in ' + node.kind;
                // err += '\nWS not captured for ' + provider.getter + ' for tokens ' +
                //     JSON.stringify(provider.text) + ' in ' + node.kind;
            } else if (provider.text.length === 1) {
                provider.i = _.find(node.ws, { text: provider.text[0] }).i;
                approvedProviders.push(provider);
                alwaysEmpty[node.kind + '.' + provider.getter] = false;
            } else {
                // TODO
                console.log('rejected (mul tok)' + node.kind + JSON.stringify(provider));
            }
        } else if (provider.i >= 0) {
            approvedProviders.push(provider);
            alwaysEmpty[node.kind + '.' + provider.getter] = false;
        } else if (alwaysEmpty[node.kind + '.' + provider.getter] === false) {
            alwaysEmpty[node.kind + '.' + provider.getter] = true;
        }
    }
    // const unprovided = _.differenceBy(node.ws, approvedProviders, 'i');// .filter(ws => !ws.static);
    const unprovided = _.differenceBy(node.ws, approvedProviders, 'i').filter(ws => !ws.static);
    if (unprovided.length > 0) {
        err += '\nWS for tokens ' + JSON.stringify(unprovided) + ' was wrongly captured at ' + node.kind;
    } else {
        let rule = [];
        const literalTokens = node.ws.filter(ws => ws.static);
        rule.push(...approvedProviders);
        rule.push(...literalTokens);
        rule = _.sortBy(rule, 'i');
        for (let i = 0; i < rule.length - 1; i++) {
            if (rule[i].i === rule[i + 1].i) {
                rule.splice(i + 1, 1);
            } else if (rule[i].type === 'node-list' && rule[i + 1].text === ',') {
                rule[i].delemter = ',';
                rule.splice(i + 1, 1);
                i--;
            } else if (rule[i].type === 'node-list' && rule[i + 1].text === ';') {
                rule[i].suffix = ';';
                rule.splice(i + 1, 1);
                i--;
            } else if (rule[i].getter === 'returnParameters') {
                rule[i].delemter = ','; // TODO: remove this hack
            } else if (rule[i].getter === 'parameters') {
                rule[i].delemter = ','; // TODO: remove this hack
            }
        }


        const withoutText = rule.map(v => (v.getter ? v.getter + '<' + v.type + '>' : v.text));
        rules.push({ kind: node.kind, rule });
        // rules.push( node.kind + ' ' + js.join(' + '));
    }

    // const noWS = _.differenceBy(values, node.ws, 'text');
    // for (let i = 0; i < noWS.length; i++) {
    //     err += '\nNo ws for ' + noWS[i].getter + ' in ' + node.kind;
    // }
    // console.log(tokens, values, node.accumulatedWS ? node.accumulatedWS.map(ws => ws.text) : '');
    return err;
}

export default processNode;
