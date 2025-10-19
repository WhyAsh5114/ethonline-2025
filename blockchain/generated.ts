//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Counter
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**

*/
export const counterAbi = [
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'by', internalType: 'uint256', type: 'uint256', indexed: false },
    ],
    name: 'Increment',
  },
  {
    type: 'function',
    inputs: [],
    name: 'inc',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [{ name: 'by', internalType: 'uint256', type: 'uint256' }],
    name: 'incBy',
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    inputs: [],
    name: 'x',
    outputs: [{ name: '', internalType: 'uint256', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const

/**

*/
export const counterAddress = {} as const

/**

*/
export const counterConfig = {
  address: counterAddress,
  abi: counterAbi,
} as const
