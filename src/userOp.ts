import {
  EntryPoint__factory,
  UserOperationStruct,
} from '@account-abstraction/contracts';
import {
  solidityPacked,
  Interface,
  ethers,
  Provider,
  BigNumberish,
} from 'ethers';

import {AccountAuth, AccountInfo, UserOpInfo} from './structs';
import {Account__factory} from '@hexlink/contracts';
import {getHexlinkContract, isContract} from './utils';
import {DUMMY_SIGNATURE, ENTRYPOINT, HEXLINK, ERC20_IFACE} from './constant';
import {
  validatePrimaryOwnerAndSign,
  validateSecondaryOwnerAndSign,
} from './auth';

export function buildSendErc20CallData(
  token: string,
  to: string,
  amount: BigInt
) {
  const data = ERC20_IFACE.encodeFunctionData('transfer', [to, amount]);
  return buildAccountExecData(token, 0, data);
}

export function buildSet2faCallData(
  account: AccountInfo,
  secondFactor: string
): string {
  const iface = new Interface(Account__factory.abi);
  const data = iface.encodeFunctionData('setSecondFactor', [secondFactor]);
  return buildAccountExecData(account.address, 0, data);
}

export function buildAccountExecData(
  target: string,
  value?: number | BigInt,
  data?: string
): string {
  const iface = new Interface(Account__factory.abi);
  return iface.encodeFunctionData('execute', [
    target,
    value ?? 0,
    data ?? '0x',
  ]);
}

export const buildUserOpInfo = async (
  account: AccountInfo,
  callData: string,
  provider: Provider,
  timeRange?: [validAfter: number, validUtil: number]
): Promise<UserOpInfo> => {
  let initCode = '0x';
  let nonce: BigNumberish = 0;
  if (await isContract(account.address, provider)) {
    nonce = await getNonce(account.address, provider);
  } else {
    initCode = await getInitCode(account.nameHash, provider);
  }
  const gasInfo = await provider.getFeeData();
  const signType = 0;
  const validationData = timeRange
    ? solidityPacked(['uint48', 'uint48'], timeRange)
    : 0;
  const primarySignature = DUMMY_SIGNATURE;
  const signature = ethers.solidityPacked(
    ['uint8', 'uint96', 'bytes'],
    [signType, validationData, primarySignature]
  );
  const userOp: UserOperationStruct = {
    sender: account.address,
    nonce,
    initCode,
    callData: callData,
    callGasLimit: 0,
    verificationGasLimit: 0,
    maxFeePerGas: gasInfo.maxFeePerGas ?? 0,
    maxPriorityFeePerGas: gasInfo.maxPriorityFeePerGas ?? 0,
    preVerificationGas: 0,
    paymasterAndData: '0x',
    signature,
  };
  const chainId = (await provider.getNetwork()).chainId;
  const userOpHash = await genUserOpHash(userOp, chainId, ENTRYPOINT);
  let signedMessage = ethers.solidityPackedKeccak256(
    ['uint8', 'uint96', 'bytes32'],
    [0, 0, userOpHash]
  );
  signedMessage = ethers.solidityPackedKeccak256(
    ['bytes32', 'bytes32'],
    [account.nameHash, signedMessage]
  );
  return {
    userOp,
    userOpHash,
    signType,
    validationData,
    signedMessage,
    primarySignature,
  };
};

export const signUserOpWithPrimaryOwner = async (
  account: AccountInfo,
  userOpInfo: UserOpInfo,
  otp: string
): Promise<AccountAuth> => {
  const {proof, jwt} = await validatePrimaryOwnerAndSign(
    account,
    otp,
    'both',
    userOpInfo.signedMessage
  );
  userOpInfo.primarySignature = proof!;
  userOpInfo.userOp.signature = await aggregateSignature(userOpInfo);
  return {primaryJwt: jwt};
};

export const signUserOpWithSecondaryOwner = async (
  auth: AccountAuth,
  userOpInfo: UserOpInfo,
  otp: string,
  mode: 'proof' | 'both'
) => {
  const {proof} = await validateSecondaryOwnerAndSign(
    auth,
    otp,
    mode,
    userOpInfo.signedMessage
  );
  userOpInfo.secondarySignature = proof!;
  userOpInfo.userOp.signature = await aggregateSignature(userOpInfo);
  return userOpInfo;
};

const aggregateSignature = async (opInfo: UserOpInfo): Promise<string> => {
  if (opInfo.secondarySignature) {
    return solidityPacked(
      ['uint8', 'uint96', 'bytes', 'bytes'],
      [
        opInfo.signType,
        opInfo.validationData,
        opInfo.primarySignature,
        opInfo.secondarySignature,
      ]
    );
  } else {
    return solidityPacked(
      ['uint8', 'uint96', 'bytes'],
      [opInfo.signType, opInfo.validationData, opInfo.primarySignature]
    );
  }
};

async function getNonce(account: string, provider: Provider) {
  const ep = EntryPoint__factory.connect(ENTRYPOINT, provider);
  return await ep.getNonce(account, 0);
}

async function getInitCode(nameHash: string, provider: Provider) {
  const hexlink = getHexlinkContract(provider);
  const data = hexlink.interface.encodeFunctionData('deploy', [nameHash]);
  return solidityPacked(['address', 'bytes'], [HEXLINK, data]);
}

const genUserOpHash = async (
  userOp: Partial<UserOperationStruct>,
  chainId: bigint,
  entryPointAddress: string
) => {
  const op = await ethers.resolveProperties(userOp);
  const opHash = ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      [
        'address',
        'uint256',
        'bytes32',
        'bytes32',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'uint256',
        'bytes32',
      ],
      [
        op.sender,
        op.nonce,
        ethers.keccak256(op.initCode!),
        ethers.keccak256(op.callData!),
        op.callGasLimit,
        op.verificationGasLimit,
        op.preVerificationGas,
        op.maxFeePerGas,
        op.maxPriorityFeePerGas,
        ethers.keccak256(op.paymasterAndData!),
      ]
    )
  );
  return ethers.keccak256(
    ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'address', 'uint256'],
      [opHash, entryPointAddress, chainId]
    )
  );
};
