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
import {AccountInfo} from './structs';

const dauthClient = new DAuth({
  baseURL: DAUTH_BASE_URL,
  clientID: DAUTH_CLEINT_ID,
});

export async function read2faSetting(
  account: AccountInfo,
  chainId: string,
  jwt: string
): Promise<{idType: string; account: string} | undefined> {
  if (isHexlinkValidator(account.auth!.secondaryOwner)) {
    throw new Error('unsupported secondary owner');
  }
  const result = await callHexlink('get2faSetting', jwt, {chainId});
  if (result.data && result.data.setting) {
    return result.data.setting as {idType: string; account: string};
  }
  return undefined;
}

export async function sendOtpToPrimaryOwner(
  account: AccountInfo,
  requestId: string
) {
  if (!isDAuthValidator(account.auth!.primaryOwner)) {
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
  chainId: string,
  data?: {idType: string; account: string}
) {
  if (isHexlinkValidator(account.auth!.secondaryOwner)) {
    throw new Error('unsupported secondary owner');
  }
  if (!account.auth!.secondaryJwt) {
    const {signed} = await callHexlink(
      'authenticate',
      account.auth!.primaryJwt!,
      {chainId}
    );
    account.auth!.secondaryJwt = signed;
  }
  await callHexlink('sendOtp', account.auth!.secondaryJwt!, data);
}

export const validatePrimaryOwnerAndSign = async (
  account: AccountInfo,
  otp: string,
  mode: 'proof' | 'jwt' | 'both',
  requestId: string
): Promise<{jwt?: string; proof?: string}> => {
  if (!isDAuthValidator(account.auth!.primaryOwner)) {
    throw new Error('unsupported primary owner');
  }
  const result = await dauthClient.service.authOtpConfirm({
    code: otp,
    request_id: requestId,
    mode,
    id_type: account.idType,
  });
  return parseDAuthResponse(mode, result);
};

export const validateSecondaryOwnerAndSign = async (
  account: AccountInfo,
  otp: string,
  mode: 'proof' | 'jwt' | 'both',
  message: string
): Promise<{jwt?: string; proof?: string}> => {
  if (!isHexlinkValidator(account.auth!.secondaryOwner)) {
    throw new Error('unsupported secondary owner');
  }
  const authToken = account.auth!.secondaryJwt!;
  const {success} = await callHexlink('validateOtp', authToken, {otp});
  if (!success) {
    throw new Error('failed to validate otp');
  }
  return await callHexlink('sign', authToken, {mode, message});
};

export const validateSecondaryOwnerAndEnable = async (
  account: AccountInfo,
  otp: string
): Promise<void> => {
  if (!isHexlinkValidator(account.auth!.secondaryOwner)) {
    throw new Error('unsupported secondary owner');
  }
  const authToken = account.auth!.secondaryJwt!;
  const {success} = await callHexlink('validateOtp', authToken, {otp});
  if (!success) {
    throw new Error('failed to validate otp');
  }
};

export const validateSecondaryOwnerAndDisable = async (
  account: AccountInfo,
  otp: string
): Promise<void> => {
  if (!isHexlinkValidator(account.auth!.secondaryOwner)) {
    throw new Error('unsupported secondary owner');
  }
  const authToken = account.auth!.secondaryJwt!;
  const {success} = await callHexlink('validateOtp', authToken, {otp});
  if (!success) {
    throw new Error('failed to validate otp');
  }
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
