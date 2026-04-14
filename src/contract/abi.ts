// ABI for the CodeIn contract (Inscription + IQDB + Connection combined)
// sendCode is calldata-only (no event) for gas efficiency.

export const CODEIN_ABI = [
  {
    "inputs": [],
    "name": "AlreadyExists",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CannotConnectSelf",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ConnectionBlocked",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EmptyColumns",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EmptyIdCol",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EmptyName",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "GateCheckFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "IdColNotInColumns",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientFee",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidConnectionTransition",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotAuthorized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotFound",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "StaleTxChainTail",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "connectionKey",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "onChainPath",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "beforeDataTx",
        "type": "string"
      }
    ],
    "name": "ConnectionCodeIn",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "connectionKey",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "requester",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "ConnectionRequested",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "connectionKey",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "newStatus",
        "type": "uint8"
      }
    ],
    "name": "ConnectionStatusChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "dbRootId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "tableSeed",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "onChainPath",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "beforeDataTx",
        "type": "string"
      }
    ],
    "name": "DbCodeInEvent",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "dbRootId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      }
    ],
    "name": "DbRootCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "dbRootId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "tableSeed",
        "type": "bytes32"
      }
    ],
    "name": "TableCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "handle",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "tailTx",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "beforeUserTx",
        "type": "string"
      }
    ],
    "name": "UserInventoryCodeInEvent",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "connections",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "dbRootId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "idCol",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "name",
        "type": "bytes"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "uint8",
            "name": "gateType",
            "type": "uint8"
          }
        ],
        "internalType": "struct IQDB.GateConfig",
        "name": "gate",
        "type": "tuple"
      },
      {
        "internalType": "address",
        "name": "partyA",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "partyB",
        "type": "address"
      },
      {
        "internalType": "uint8",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "requester",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "blocker",
        "type": "uint8"
      },
      {
        "internalType": "int64",
        "name": "lastTimestamp",
        "type": "int64"
      },
      {
        "internalType": "string",
        "name": "txChainTail",
        "type": "string"
      },
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "dbRootId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "tableSeed",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "tableName",
        "type": "bytes"
      },
      {
        "internalType": "bytes[]",
        "name": "columnNames",
        "type": "bytes[]"
      },
      {
        "internalType": "bytes",
        "name": "idCol",
        "type": "bytes"
      },
      {
        "internalType": "bytes[]",
        "name": "extKeys",
        "type": "bytes[]"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "uint8",
            "name": "gateType",
            "type": "uint8"
          }
        ],
        "internalType": "struct IQDB.GateConfig",
        "name": "gate",
        "type": "tuple"
      },
      {
        "internalType": "address[]",
        "name": "writers",
        "type": "address[]"
      }
    ],
    "name": "createPrivateTable",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "dbRootId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "tableSeed",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "tableName",
        "type": "bytes"
      },
      {
        "internalType": "bytes[]",
        "name": "columnNames",
        "type": "bytes[]"
      },
      {
        "internalType": "bytes",
        "name": "idCol",
        "type": "bytes"
      },
      {
        "internalType": "bytes[]",
        "name": "extKeys",
        "type": "bytes[]"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "uint8",
            "name": "gateType",
            "type": "uint8"
          }
        ],
        "internalType": "struct IQDB.GateConfig",
        "name": "gate",
        "type": "tuple"
      },
      {
        "internalType": "address[]",
        "name": "writers",
        "type": "address[]"
      }
    ],
    "name": "createTable",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "dbRootId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "tableSeed",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "onChainPath",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "metadata",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "beforeDataTx",
        "type": "string"
      }
    ],
    "name": "dbCodeIn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "dbRootId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "tableSeed",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "tableName",
        "type": "bytes"
      },
      {
        "internalType": "string",
        "name": "targetTx",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "onChainPath",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "metadata",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "beforeDataTx",
        "type": "string"
      }
    ],
    "name": "dbInstructionCodeIn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "dbRoots",
    "outputs": [
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "exists",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "connKey",
        "type": "bytes32"
      }
    ],
    "name": "getConnection",
    "outputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "dbRootId",
            "type": "bytes32"
          },
          {
            "internalType": "bytes[]",
            "name": "columnNames",
            "type": "bytes[]"
          },
          {
            "internalType": "bytes",
            "name": "idCol",
            "type": "bytes"
          },
          {
            "internalType": "bytes[]",
            "name": "extKeys",
            "type": "bytes[]"
          },
          {
            "internalType": "bytes",
            "name": "name",
            "type": "bytes"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "tokenAddress",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              },
              {
                "internalType": "uint8",
                "name": "gateType",
                "type": "uint8"
              }
            ],
            "internalType": "struct IQDB.GateConfig",
            "name": "gate",
            "type": "tuple"
          },
          {
            "internalType": "address",
            "name": "partyA",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "partyB",
            "type": "address"
          },
          {
            "internalType": "uint8",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "requester",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "blocker",
            "type": "uint8"
          },
          {
            "internalType": "int64",
            "name": "lastTimestamp",
            "type": "int64"
          },
          {
            "internalType": "string",
            "name": "txChainTail",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "exists",
            "type": "bool"
          }
        ],
        "internalType": "struct CodeIn.ConnectionInfo",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "a",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "b",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "dbRootId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "seed",
        "type": "bytes32"
      }
    ],
    "name": "getConnectionKey",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "dbRootId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "tableSeed",
        "type": "bytes32"
      }
    ],
    "name": "getTable",
    "outputs": [
      {
        "components": [
          {
            "internalType": "bytes[]",
            "name": "columnNames",
            "type": "bytes[]"
          },
          {
            "internalType": "bytes",
            "name": "idCol",
            "type": "bytes"
          },
          {
            "internalType": "bytes[]",
            "name": "extKeys",
            "type": "bytes[]"
          },
          {
            "internalType": "bytes",
            "name": "name",
            "type": "bytes"
          },
          {
            "internalType": "int64",
            "name": "lastTimestamp",
            "type": "int64"
          },
          {
            "components": [
              {
                "internalType": "address",
                "name": "tokenAddress",
                "type": "address"
              },
              {
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
              },
              {
                "internalType": "uint8",
                "name": "gateType",
                "type": "uint8"
              }
            ],
            "internalType": "struct IQDB.GateConfig",
            "name": "gate",
            "type": "tuple"
          },
          {
            "internalType": "address[]",
            "name": "writers",
            "type": "address[]"
          },
          {
            "internalType": "string",
            "name": "txChainTail",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "exists",
            "type": "bool"
          }
        ],
        "internalType": "struct IQDB.Table",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getUserConnectionKeys",
    "outputs": [
      {
        "internalType": "bytes32[]",
        "name": "",
        "type": "bytes32[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "dbRootId",
        "type": "bytes32"
      }
    ],
    "name": "initializeDbRoot",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "instructionTableTimestamps",
    "outputs": [
      {
        "internalType": "int64",
        "name": "",
        "type": "int64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "otherParty",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "dbRootId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "connectionSeed",
        "type": "bytes32"
      },
      {
        "internalType": "uint8",
        "name": "newStatus",
        "type": "uint8"
      }
    ],
    "name": "manageConnection",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "dbRootId",
        "type": "bytes32"
      },
      {
        "internalType": "address[]",
        "name": "tableCreators",
        "type": "address[]"
      },
      {
        "internalType": "address[]",
        "name": "extCreators",
        "type": "address[]"
      }
    ],
    "name": "manageTableCreators",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "dbRootId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "tableSeed",
        "type": "bytes32"
      }
    ],
    "name": "onboardTable",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "dbRootId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "connectionSeed",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "tableName",
        "type": "bytes"
      },
      {
        "internalType": "bytes[]",
        "name": "columnNames",
        "type": "bytes[]"
      },
      {
        "internalType": "bytes",
        "name": "idCol",
        "type": "bytes"
      },
      {
        "internalType": "bytes[]",
        "name": "extKeys",
        "type": "bytes[]"
      }
    ],
    "name": "requestConnection",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string[]",
        "name": "codes",
        "type": "string[]"
      },
      {
        "internalType": "string",
        "name": "beforeTx",
        "type": "string"
      },
      {
        "internalType": "uint8",
        "name": "method",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "decodeBreak",
        "type": "uint8"
      }
    ],
    "name": "sendCode",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "otherParty",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "dbRootId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "connectionSeed",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "myTxHash",
        "type": "string"
      }
    ],
    "name": "updateConnectionTxChainTail",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "dbRootId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32[]",
        "name": "newTableSeeds",
        "type": "bytes32[]"
      }
    ],
    "name": "updateDbRootTableList",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "dbRootId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "tableSeed",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "tableName",
        "type": "bytes"
      },
      {
        "internalType": "bytes[]",
        "name": "columnNames",
        "type": "bytes[]"
      },
      {
        "internalType": "bytes",
        "name": "idCol",
        "type": "bytes"
      },
      {
        "internalType": "bytes[]",
        "name": "extKeys",
        "type": "bytes[]"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "tokenAddress",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "uint8",
            "name": "gateType",
            "type": "uint8"
          }
        ],
        "internalType": "struct IQDB.GateConfig",
        "name": "gate",
        "type": "tuple"
      },
      {
        "internalType": "address[]",
        "name": "writers",
        "type": "address[]"
      }
    ],
    "name": "updateTable",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "dbRootId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "tableSeed",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "myTxHash",
        "type": "string"
      }
    ],
    "name": "updateTableTxChainTail",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "metadata",
        "type": "bytes"
      }
    ],
    "name": "updateUserMetadata",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "myTxHash",
        "type": "string"
      }
    ],
    "name": "updateUserTxChainTail",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "userConnectionKeys",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "handle",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "tailTx",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "typeField",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "offset",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "beforeUserTx",
        "type": "string"
      }
    ],
    "name": "userInventoryCodeIn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "userMetadata",
    "outputs": [
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "userTxChainTail",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "otherParty",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "dbRootId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "connectionSeed",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "onChainPath",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "metadata",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "beforeDataTx",
        "type": "string"
      }
    ],
    "name": "walletConnectionCodeIn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
