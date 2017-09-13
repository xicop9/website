import * as _ from 'lodash';
import * as React from 'react';
import {colors} from 'material-ui/styles';
import TextField from 'material-ui/TextField';
import {constants} from 'ts/utils/constants';
import {Blockchain} from 'ts/blockchain';
import {Token, TokenState, TokenByAddress, AlertTypes} from 'ts/types';
import {AddressInput} from 'ts/components/inputs/address_input';
import {Alert} from 'ts/components/ui/alert';
import {LifeCycleRaisedButton} from 'ts/components/ui/lifecycle_raised_button';
import {RequiredLabel} from 'ts/components/ui/required_label';
import * as BigNumber from 'bignumber.js';

interface NewTokenFormProps {
    blockchain: Blockchain;
    tokenByAddress: TokenByAddress;
    onNewTokenSubmitted: (token: Token, tokenState: TokenState) => void;
}

interface NewTokenFormState {
    globalErrMsg: string;
    name: string;
    nameErrText: string;
    symbol: string;
    symbolErrText: string;
    address: string;
    shouldShowAddressIncompleteErr: boolean;
    decimals: string;
    decimalsErrText: string;
}

export class NewTokenForm extends React.Component<NewTokenFormProps, NewTokenFormState> {
    constructor(props: NewTokenFormProps) {
        super(props);
        this.state = {
            address: '',
            globalErrMsg: '',
            name: '',
            nameErrText: '',
            shouldShowAddressIncompleteErr: false,
            symbol: '',
            symbolErrText: '',
            decimals: '18',
            decimalsErrText: '',
        };
    }
    public render() {
        return (
            <div className="mx-auto pb2" style={{width: 256}}>
                <div>
                    <TextField
                        floatingLabelFixed={true}
                        floatingLabelStyle={{color: colors.grey500}}
                        floatingLabelText={<RequiredLabel label="Name" />}
                        value={this.state.name}
                        errorText={this.state.nameErrText}
                        onChange={this.onTokenNameChanged.bind(this)}
                    />
                </div>
                <div>
                    <TextField
                        floatingLabelFixed={true}
                        floatingLabelStyle={{color: colors.grey500}}
                        floatingLabelText={<RequiredLabel label="Symbol" />}
                        value={this.state.symbol}
                        errorText={this.state.symbolErrText}
                        onChange={this.onTokenSymbolChanged.bind(this)}
                    />
                </div>
                <div>
                    <AddressInput
                        isRequired={true}
                        label="Contract address"
                        initialAddress=""
                        shouldShowIncompleteErrs={this.state.shouldShowAddressIncompleteErr}
                        updateAddress={this.onTokenAddressChanged.bind(this)}
                    />
                </div>
                <div>
                    <TextField
                        floatingLabelFixed={true}
                        floatingLabelStyle={{color: colors.grey500}}
                        floatingLabelText={<RequiredLabel label="Decimals" />}
                        value={this.state.decimals}
                        errorText={this.state.decimalsErrText}
                        onChange={this.onTokenDecimalsChanged.bind(this)}
                    />
                </div>
                <div className="pt2 mx-auto" style={{width: 120}}>
                    <LifeCycleRaisedButton
                        labelReady="Add"
                        labelLoading="Adding..."
                        labelComplete="Added!"
                        onClickAsyncFn={this.onAddNewTokenClickAsync.bind(this)}
                    />
                </div>
                {this.state.globalErrMsg !== '' &&
                    <Alert type={AlertTypes.ERROR} message={this.state.globalErrMsg} />
                }
            </div>
        );
    }
    private async onAddNewTokenClickAsync() {
        // Trigger validation of name and symbol
        this.onTokenNameChanged(undefined, this.state.name);
        this.onTokenSymbolChanged(undefined, this.state.symbol);
        this.onTokenDecimalsChanged(undefined, this.state.decimals);

        const isAddressIncomplete = this.state.address === '';
        let doesContractExist = false;
        if (!isAddressIncomplete) {
            doesContractExist = await this.props.blockchain.doesContractExistAtAddressAsync(this.state.address);
        }

        let hasBalanceAllowanceErr = false;
        let balance = new BigNumber(0);
        let allowance = new BigNumber(0);
        if (doesContractExist) {
            try {
                [
                    balance,
                    allowance,
                ] = await this.props.blockchain.getCurrentUserTokenBalanceAndAllowanceAsync(this.state.address);
            } catch (err) {
                hasBalanceAllowanceErr = true;
            }
        }

        let globalErrMsg = '';
        if (this.state.nameErrText !== '' || this.state.symbolErrText !== '' ||
            this.state.decimalsErrText !== '' || isAddressIncomplete) {
            globalErrMsg = 'Please fix the above issues';
        } else if (!doesContractExist) {
            globalErrMsg = 'No contract found at supplied address';
        } else if (hasBalanceAllowanceErr) {
            globalErrMsg = 'Unsuccessful call to `balanceOf` and/or `allowance` on supplied contract address';
        } else if (!isAddressIncomplete && !_.isUndefined(this.props.tokenByAddress[this.state.address])) {
            globalErrMsg = 'A token already exists with this address';
        }

        if (globalErrMsg !== '') {
            this.setState({
                globalErrMsg,
                shouldShowAddressIncompleteErr: isAddressIncomplete,
            });
            return;
        }

        const newToken: Token = {
            address: this.state.address,
            decimals: _.parseInt(this.state.decimals),
            iconUrl: constants.DEFAULT_TOKEN_ICON_URL,
            name: this.state.name,
            symbol: this.state.symbol.toUpperCase(),
            isTracked: true,
            isRegistered: false,
        };
        const newTokenState: TokenState = {
            balance,
            allowance,
        };
        this.props.onNewTokenSubmitted(newToken, newTokenState);
    }
    private onTokenNameChanged(e: any, name: string) {
        let nameErrText = '';
        const maxLength = 30;
        const tokens = _.values(this.props.tokenByAddress);
        const tokenWithNameIfExists = _.find(tokens, {name});
        const tokenWithNameExists = !_.isUndefined(tokenWithNameIfExists);
        if (name === '') {
            nameErrText = 'Name is required';
        } else if (!this.isValidName(name)) {
            nameErrText = 'Name should only contain letters, digits and spaces';
        } else if (name.length > maxLength) {
            nameErrText = `Max length is ${maxLength}`;
        } else if (tokenWithNameExists) {
            nameErrText = 'Token with this name already exists';
        }

        this.setState({
            name,
            nameErrText,
        });
    }
    private onTokenSymbolChanged(e: any, symbol: string) {
        let symbolErrText = '';
        const maxLength = 5;
        const tokens = _.values(this.props.tokenByAddress);
        const tokenWithSymbolExists = !_.isUndefined(_.find(tokens, {symbol}));
        if (symbol === '') {
            symbolErrText = 'Symbol is required';
        } else if (!this.isLetters(symbol)) {
            symbolErrText = 'Can only include letters';
        } else if (symbol.length > maxLength) {
            symbolErrText = `Max length is ${maxLength}`;
        } else if (tokenWithSymbolExists) {
            symbolErrText = 'Token with symbol already exists';
        }

        this.setState({
            symbol,
            symbolErrText,
        });
    }
    private onTokenDecimalsChanged(e: any, decimals: string) {
        let decimalsErrText = '';
        const maxLength = 2;
        if (decimals === '') {
            decimalsErrText = 'Decimals is required';
        } else if (!this.isInteger(decimals)) {
            decimalsErrText = 'Must be an integer';
        } else if (decimals.length > maxLength) {
            decimalsErrText = `Max length is ${maxLength}`;
        }

        this.setState({
            decimals,
            decimalsErrText,
        });
    }
    private onTokenAddressChanged(address?: string) {
        if (!_.isUndefined(address)) {
            this.setState({
                address,
            });
        }
    }
    private isValidName(input: string) {
        return /^[a-z0-9 ]+$/i.test(input);
    }
    private isInteger(input: string) {
        return /^[0-9]+$/i.test(input);
    }
    private isLetters(input: string) {
        return /^[a-zA-Z]+$/i.test(input);
    }
}
