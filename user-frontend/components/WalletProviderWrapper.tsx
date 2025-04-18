"use client"
import React, { FC, ReactNode, useEffect, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';


export const WalletProviderWrapper: FC<{ children: ReactNode }> = ({ children }) => {

    const network = WalletAdapterNetwork.Devnet;

    const endpoint = useMemo( () => clusterApiUrl(network), [network] );
    const wallets = useMemo(
        () => [],
        [network]
    );

    useEffect(() => {
        console.log("Checking for wallets...");
        
    }, []);

    
    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

