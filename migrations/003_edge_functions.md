# Supabase Edge Functions Setup

## Overview
This guide explains how to set up Supabase Edge Functions for your grocery store platform.

## Edge Functions to Create

### 1. Payment Processing Function
Create a function to handle payment webhooks and processing.

```typescript
// functions/payment-webhook/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { paymentMethod, orderData, webhookData } = await req.json()

    // Process payment based on method
    let result;
    switch (paymentMethod) {
      case 'jazzcash':
        result = await processJazzCashPayment(webhookData, supabase)
        break
      case 'easypaisa':
        result = await processEasypaisaPayment(webhookData, supabase)
        break
      default:
        throw new Error('Unsupported payment method')
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function processJazzCashPayment(webhookData: any, supabase: any) {
  // Verify JazzCash signature
  // Update order status
  // Send notifications
}

async function processEasypaisaPayment(webhookData: any, supabase: any) {
  // Verify Easypaisa signature
  // Update order status
  // Send notifications
}
```

### 2. Order Processing Function
Handle order creation and inventory updates.

```typescript
// functions/process-order/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  const { orderData } = await req.json()

  // Validate products availability
  // Update inventory
  // Create order
  // Send confirmation emails
  // Notify delivery service

  return new Response(
    JSON.stringify({ success: true, orderId: 'order-id' }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

### 3. Delivery Tracking Function
Handle delivery service webhooks and tracking updates.

```typescript
// functions/delivery-tracking/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const { service, trackingData } = await req.json()

  // Process tracking updates from Bykea, TCS, Leopards
  // Update order status
  // Send notifications to customers

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

### 4. Inventory Management Function
Automated inventory tracking and alerts.

```typescript
// functions/inventory-management/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Check low stock items
  // Send reorder alerts
  // Update product availability
  // Generate inventory reports

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

## Deployment Commands

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy functions
supabase functions deploy payment-webhook
supabase functions deploy process-order
supabase functions deploy delivery-tracking
supabase functions deploy inventory-management
```

## Environment Variables

Set these in your Supabase project dashboard:

```
JAZZCASH_MERCHANT_ID=your_merchant_id
JAZZCASH_PASSWORD=your_password
JAZZCASH_INTEGRITY_SALT=your_salt

EASYPAISA_STORE_ID=your_store_id
EASYPAISA_HASH_KEY=your_hash_key

TCS_API_KEY=your_tcs_key
BYKEA_API_KEY=your_bykea_key
LEOPARDS_API_KEY=your_leopards_key

SMTP_HOST=your_smtp_host
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
```

## Webhooks Configuration

### Payment Webhooks
- JazzCash: Point to `https://your-project.supabase.co/functions/v1/payment-webhook`
- Easypaisa: Point to `https://your-project.supabase.co/functions/v1/payment-webhook`

### Delivery Service Webhooks
- Bykea: Point to `https://your-project.supabase.co/functions/v1/delivery-tracking`
- TCS: Point to `https://your-project.supabase.co/functions/v1/delivery-tracking`
- Leopards: Point to `https://your-project.supabase.co/functions/v1/delivery-tracking`

## Testing

```bash
# Test functions locally
supabase functions serve payment-webhook --env-file .env.local

# Test with curl
curl -X POST 'http://localhost:54321/functions/v1/payment-webhook' \
  -H 'Authorization: Bearer your-anon-key' \
  -H 'Content-Type: application/json' \
  -d '{ "paymentMethod": "jazzcash", "orderData": {...} }'
```

## Security Considerations

1. **Webhook Verification**: Always verify webhook signatures
2. **Rate Limiting**: Implement rate limiting for public endpoints
3. **Input Validation**: Validate all input data
4. **Error Handling**: Don't expose sensitive error information
5. **Logging**: Log important events for debugging and auditing