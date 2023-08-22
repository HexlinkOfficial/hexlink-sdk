import {keccak256, getBytes, Provider} from 'ethers';
import {Hexlink__factory, Hexlink} from '@hexlink/contracts';

import {HEXLINK} from './constant';

export function getHexlinkContract(provider: Provider): Hexlink {
  return Hexlink__factory.connect(HEXLINK, provider);
}

export function hash(name: string) {
  return keccak256(getBytes(name));
}

export async function isContract(address: string, provider: Provider) {
  try {
    const code = await provider.getCode(address);
    if (code !== '0x') return true;
  } catch (error) {
    // no code at address
  }
  return false;
}
