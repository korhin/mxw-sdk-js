'use strict';

import * as errors from '../errors';
import { isUndefinedOrNullOrEmpty } from '.';


export type Network = {
    name: string,
    chainId: string,
    _defaultProvider?: (providers: any) => any
}

export type Networkish = Network | string | number;

function mxwDefaultProvider(network: string): (providers: any) => any {
    return function (providers: any): any {
        let providerList: Array<any> = [];

        if (providerList.length === 0) { return null; }

        if (providers.FallbackProvider) {
            return new providers.FallbackProvider(providerList);;
        }

        return providerList[0];
    }
}

const homestead: Network = {
    chainId: "mxw",
    name: "homestead",
    _defaultProvider: mxwDefaultProvider('homestead')
};

const twinturbocharge: Network = {
    chainId: "ttc",
    name: "twinturbocharge",
    _defaultProvider: mxwDefaultProvider('twinturbocharge')
};

const networks: { [name: string]: Network } = {
    unspecified: {
        chainId: "0",
        name: 'unspecified'
    },

    homestead: homestead,
    mainnet: homestead,

    twinturbocharge: twinturbocharge,
    testnet: twinturbocharge
}

/**
 *  getNetwork
 *
 *  Converts a named common networks or chain ID (network ID) to a Network
 *  and verifies a network is a valid Network..
 */
export function getNetwork(network: Networkish): Network {
    // No network (null)
    if (network == null) { return null; }

    if (typeof (network) === 'number') {
        for (let name in networks) {
            let n = networks[name];
            if (n.chainId === network.toString()) {
                return {
                    name: n.name,
                    chainId: n.chainId,
                    _defaultProvider: (n._defaultProvider || null)
                };
            }
        }

        return {
            chainId: network.toString(),
            name: 'unknown'
        };
    }

    if (typeof (network) === 'string') {
        let n = networks[network];
        if (n == null) { return null; }
        return {
            name: n.name,
            chainId: n.chainId,
            _defaultProvider: (n._defaultProvider || null)
        };
    }

    let n = networks[network.name];

    // Not a standard network; check that it is a valid network in general
    if (!n) {
        if (typeof (network.chainId) === 'number') {
            network.chainId = String(network.chainId);
        }
        return network;
    }

    // Make sure the chainId matches the expected network chainId (or is 0; disable EIP-155)
    if (isUndefinedOrNullOrEmpty(network.chainId) && network.chainId !== n.chainId) {
        errors.throwError('network chainId mismatch', errors.INVALID_ARGUMENT, { arg: 'network', value: network });
    }

    // Standard Network (allow overriding the ENS address)
    return {
        name: network.name,
        chainId: n.chainId,
        _defaultProvider: (network._defaultProvider || n._defaultProvider || null)
    };
}
