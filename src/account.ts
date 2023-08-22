/* eslint-disable camelcase */

import {Provider, ZeroAddress} from 'ethers';
import {Account__factory, INameService__factory} from '@hexlink/contracts';
import {hash, getHexlinkContract, isContract} from './utils';
import {AccountInfo} from './structs';

export async function getAccountAddress(
  idType: 'mailto' | 'tel',
  account: string,
  provider: Provider
): Promise<string> {
  const nameHash = hash(`${idType}:${account}`);
  const hexlink = getHexlinkContract(provider);
  return await hexlink.getOwnedAccount(hash(nameHash));
}

export async function getAccountInfo(
  idType: 'mailto' | 'tel',
  account: string,
  provider: Provider
): Promise<AccountInfo> {
  const nameHash = hash(`${idType}:${account}`);
  const hexlink = getHexlinkContract(provider);
  const address = await hexlink.getOwnedAccount(hash(nameHash));
  const acc = Account__factory.connect(address, provider);
  const version = await acc.version();
  const accCommon = {idType, account, nameHash, address, version};
  if (await isContract(await acc.getAddress(), provider)) {
    const secondFactor = await acc.getSecondFactor();
    return {
      ...accCommon,
      primaryOwner: await acc.getNameOwner(),
      secondaryOwner: secondFactor === ZeroAddress ? undefined : secondFactor,
    };
  } else {
    const hexlink = getHexlinkContract(provider);
    const ns = INameService__factory.connect(
      await hexlink.getNameService(),
      provider
    );
    return {
      ...accCommon,
      primaryOwner: await ns.defaultOwner(),
    };
  }
}
