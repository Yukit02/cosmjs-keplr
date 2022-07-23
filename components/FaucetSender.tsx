import { Coin, StargateClient, SigningStargateClient } from "@cosmjs/stargate"
import { ChangeEvent, Component, MouseEvent } from "react"
import styles from '../styles/Home.module.css'
import { Window as KeplrWindow } from "@keplr-wallet/types"
import { AccountData, OfflineSigner } from "@cosmjs/proto-signing"
import { Chain } from '../config/chain';
declare global {
    interface Window extends KeplrWindow {}
}

interface FaucetSenderState {
    denom: string
    faucetBalance: string
    myAddress: string
    myBalance: string
    toSend: string
}

export interface FaucetSenderProps {
    faucetAddress: string
    rpcUrl: string
}

export class FaucetSender extends Component<FaucetSenderProps, FaucetSenderState> {
    // Set the initial state
    constructor(props:FaucetSenderProps) {
        super(props)
        this.state = {
            denom: "Loading...",
            faucetBalance: "Loading...",
            myAddress: "Click first",
            myBalance: "Click first",
            toSend: "0",
        }
        setTimeout(this.init, 500)
    }

    init = async() => this.updateFaucetBalance(await StargateClient.connect(this.props.rpcUrl))

     // Get the faucet's balance
    updateFaucetBalance = async(client: StargateClient) => {
      const balances: readonly Coin[] = await client.getAllBalances(this.props.faucetAddress)
      const first: Coin = balances[0]
      this.setState({
          denom: first.denom,
          faucetBalance: first.amount,
      })
    }

    // Store changed token amount to state
    onToSendChanged = (e: ChangeEvent<HTMLInputElement>) => this.setState({
        toSend: e.currentTarget.value
    })

    // When the user clicks the "send to faucet button"
    onSendClicked = async(e: MouseEvent<HTMLButtonElement>) => {
      const { keplr } = window
      if (!keplr) {
          alert("You need to install Keplr")
          return
      }
      // Get the current state and amount of tokens that we want to transfer
      const { denom, toSend } = this.state
      const { faucetAddress, rpcUrl } = this.props
      // Suggest the testnet chain to Keplr
      await keplr.experimentalSuggestChain(Chain.local())
      // Create the signing client
      const offlineSigner: OfflineSigner = window.getOfflineSigner!(Chain.local().chainId)
      const signingClient = await SigningStargateClient.connectWithSigner(
          rpcUrl,
          offlineSigner,
      )
      // Get the address and balance of your user
      const account: AccountData = (await offlineSigner.getAccounts())[0]
      this.setState({
          myAddress: account.address,
          myBalance: (await signingClient.getBalance(account.address, denom)).amount,
      })
      // Submit the transaction to send tokens to the faucet
      const sendResult = await signingClient.sendTokens(
          account.address,
          faucetAddress,
          [
              {
                  denom: denom,
                  amount: toSend,
              },
          ],
          {
              amount: [{ denom: "uatom", amount: "500" }],
              gas: "200000",
          },
      )
      // Print the result to the console
      console.log(sendResult)
      // Update the balance in the user interface
      this.setState({
          myBalance: (await signingClient.getBalance(account.address, denom)).amount,
          faucetBalance: (await signingClient.getBalance(faucetAddress, denom)).amount,
      })
    }

    // The render function that draws the component at init and at state change
    render() {
        const { denom, faucetBalance, myAddress, myBalance, toSend } = this.state
        const { faucetAddress } = this.props
        console.log(toSend)
        // The web page structure itself
        return <div>
            <fieldset className={styles.card}>
                <legend>Faucet</legend>
                <p>Address: {faucetAddress}</p>
                <p>Balance: {faucetBalance}</p>
            </fieldset>
            <fieldset className={styles.card}>
                <legend>You</legend>
                <p>Address: {myAddress}</p>
                <p>Balance: {myBalance}</p>
            </fieldset>
            <fieldset className={styles.card}>
                <legend>Send</legend>
                <p>To faucet:</p>
                <input value={toSend} type="number" onChange={this.onToSendChanged}/> {denom}
                <button onClick={this.onSendClicked}>Send to faucet</button>
            </fieldset>
        </div>
    }
}
