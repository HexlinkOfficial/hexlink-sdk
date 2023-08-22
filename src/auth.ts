import {getAddress, AddressLike} from 'ethers';
import axios from 'axios';
import DAuth from '@dauth/core';

import {
  DAUTH_BASE_URL,
  DAUTH_CLEINT_ID,
  DAUTH_VALIDATOR,
  HEXLINK_BASE_URL,
  HEXLINK_VALIDATOR,
} from './constant';
import {AccountAuth, AccountInfo} from './structs';

const dauthClient = new DAuth({
  baseURL: DAUTH_BASE_URL,
  clientID: DAUTH_CLEINT_ID,
});

export async function update2faSetting(
  account: AccountInfo,
  chainId: string,
  jwt: string
): Promise<void> {
  if (isHexlinkValidator(account.secondaryOwner)) {
    throw new Error('unsupported secondary owner');
  }
  const {setting} = await callHexlink('get2faSetting', jwt, {chainId});
  account.secondFactor = setting;
}

export async function sendOtpToPrimaryOwner(
  account: AccountInfo,
  requestId: string
) {
  if (!isDAuthValidator(account.primaryOwner)) {
    throw new Error('unsupported primary owner');
  }
  requestId = requestId.startsWith('0x') ? requestId.slice(2) : requestId;
  await dauthClient.service.sendOtp({
    account: account.account,
    id_type: account.idType,
    request_id: requestId, // remove 0x
  });
}

export async function sendOtpToSecondaryOwner(
  account: AccountInfo,
  auth: AccountAuth,
  chainId: string,
  data?: {idType: string; account: string}
) {
  if (isHexlinkValidator(account.secondaryOwner)) {
    throw new Error('unsupported secondary owner');
  }
  if (!auth!.secondaryJwt) {
    const {signed} = await callHexlink('authenticate', auth!.primaryJwt!, {
      chainId,
    });
    auth!.secondaryJwt = signed;
  }
  await callHexlink('sendOtp', auth!.secondaryJwt!, data);
}

export const validatePrimaryOwnerAndSign = async (
  account: AccountInfo,
  otp: string,
  mode: 'proof' | 'jwt' | 'both',
  requestId: string
): Promise<{jwt?: string; proof?: string}> => {
  const result = await dauthClient.service.authOtpConfirm({
    code: otp,
    request_id: requestId,
    mode,
    id_type: account.idType,
  });
  return parseDAuthResponse(mode, result);
};

export const validateSecondaryOwnerAndSign = async (
  auth: AccountAuth,
  otp: string,
  mode: 'proof' | 'jwt' | 'both',
  message: string
): Promise<{jwt?: string; proof?: string}> => {
  await validateSecondaryOwner(auth, otp);
  return await signWithSecondaryOwner(auth, mode, message);
};

export const validateSecondaryOwner = async (
  auth: AccountAuth,
  otp: string
): Promise<void> => {
  const authToken = auth.secondaryJwt!;
  const {success} = await callHexlink('validateOtp', authToken, {otp});
  if (!success) {
    throw new Error('failed to validate otp');
  }
};

export const signWithSecondaryOwner = async (
  auth: AccountAuth,
  mode: 'proof' | 'jwt' | 'both',
  message: string
): Promise<{jwt?: string; proof?: string}> => {
  const authToken = auth.secondaryJwt!;
  return await callHexlink('sign', authToken, {mode, message});
};

export const disableSecondaryOwner = async (
  auth: AccountAuth
): Promise<void> => {
  const authToken = auth.secondaryJwt!;
  return await callHexlink('disable', authToken);
};

function parseDAuthResponse(
  mode: 'proof' | 'jwt' | 'both',
  result: {data: any}
) {
  if (mode === 'both') {
    return {
      jwt: result.data.jwt as string,
      proof: result.data.proof.signature as string,
    };
  } else if (mode === 'proof') {
    return {
      proof: result.data.signature as string,
    };
  } else {
    return {
      jwt: result.data as string,
    };
  }
}

function isDAuthValidator(address: AddressLike | undefined): boolean {
  return address !== undefined && getAddress(DAUTH_VALIDATOR) === address;
}

function isHexlinkValidator(address: AddressLike | undefined): boolean {
  return address !== undefined && getAddress(HEXLINK_VALIDATOR) === address;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const callHexlink = async (func: string, token: string, data?: any) => {
  const config = token ? {headers: {Authorization: 'Bearer ' + token}} : {};
  const response = await axios.post(
    `${HEXLINK_BASE_URL}${func}`,
    data ?? {},
    config
  );
  return response.data;
};
