'use client'

import { useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi'
import { counterAbi } from 'blockchain/generated'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect } from 'react'

// Replace with your deployed contract address
const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3' as `0x${string}`

export function CounterDemo() {
  // Read the current counter value - fully type-safe!
  const { data: count, refetch } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: counterAbi,
    functionName: 'x',
  })

  // Write to the contract - fully type-safe!
  const { writeContract, isPending } = useWriteContract()

  // Watch for Increment events - fully type-safe!
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: counterAbi,
    eventName: 'Increment',
    onLogs(logs) {
      console.log('Increment event:', logs)
      refetch()
    },
  })

  const handleIncrement = () => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: counterAbi,
      functionName: 'inc',
    })
  }

  const handleIncrementBy = (amount: bigint) => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: counterAbi,
      functionName: 'incBy',
      args: [amount],
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Counter Contract</CardTitle>
        <CardDescription>
          Type-safe interaction with your Counter smart contract
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Current count:</p>
          <p className="text-4xl font-bold">{count?.toString() ?? '0'}</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleIncrement}
            disabled={isPending}
          >
            Increment by 1
          </Button>
          <Button 
            onClick={() => handleIncrementBy(BigInt(5))}
            disabled={isPending}
            variant="secondary"
          >
            Increment by 5
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
