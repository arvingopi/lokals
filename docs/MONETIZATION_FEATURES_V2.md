# Lokals Monetization: Simplified Single-Tier Approach

## Overview
Anonymous location-based chat with device-based restrictions and a single Pro subscription tier.

## Core Principle
"One free profile per device, unlimited with Pro"

## Monetization Model

### Free Tier
- ✅ 1 profile per device
- ✅ Set username once (or use auto-generated)
- ✅ Set location once
- ❌ No age/gender info
- ❌ No profile changes
- ❌ No username locking
- ❌ Cannot create additional profiles

### Pro Tier ($6.99/month)
- ✅ Unlimited profiles per device
- ✅ Lock username (globally unique)
- ✅ Add age & gender info
- ✅ Change any profile detail anytime
- ✅ Change location anytime
- ✅ Blue verified badge
- ✅ Profile switching
- ✅ Priority in user lists
- ✅ Ad-free experience (future)

## Device Fingerprinting Implementation

### Components We'll Track
1. **Canvas fingerprint** (primary)
2. **Screen dimensions & color depth**
3. **Timezone & language**
4. **Hardware concurrency (CPU cores)**
5. **Platform/OS**
6. **WebGL renderer info**

### What We WON'T Track
- IP addresses (respect VPN users)
- Actual location (only user-provided)
- Browsing history
- Cookies from other sites
- Any personally identifiable info

## User Flows

### First-Time User
```
1. Visit lokals.chat
2. Device fingerprint generated silently
3. Choose location → Enter chat
4. Prompt to set username (optional)
5. Start chatting!
```

### Returning Free User (Same Device)
```
1. Visit lokals.chat
2. Device recognized
3. Auto-load previous profile
4. Continue chatting
5. If tries to "Start Fresh" → Show Pro upgrade
```

### Pro Subscriber Flow
```
1. Subscribe via Stripe
2. Device is "unlocked"
3. Can create multiple profiles
4. Switch between profiles easily
5. All profiles on device have Pro features
```

## Key Features

### 1. Profile Switcher (Pro Only)
- Dropdown menu with all profiles
- Quick switch without logout
- Visual indicator for active profile
- "Create New Profile" option

### 2. Username Locking (Pro Only)
- Global uniqueness check
- 30-day hold after subscription ends
- Can release username voluntarily
- No trading/selling (prevent abuse)

### 3. Device Management
- View "This device" info
- See profiles on this device
- Clear device data (support option)
- No cross-device sync (privacy)

### 4. Subscription Management
- Stripe payment integration
- Cancel anytime
- Reactivate keeps username lock
- No refunds (clear policy)

## Technical Implementation Plan

### Phase 1: MVP (Week 1)
1. **Device Fingerprinting**
   ```typescript
   // lib/fingerprint.ts
   - Canvas fingerprinting
   - Basic device info collection
   - SHA-256 hashing
   ```

2. **Database Updates**
   ```sql
   -- Add to users table
   ALTER TABLE users ADD device_fingerprint VARCHAR(64);
   ALTER TABLE users ADD is_pro BOOLEAN DEFAULT FALSE;
   ALTER TABLE users ADD profile_locked BOOLEAN DEFAULT FALSE;
   
   -- Device tracking
   CREATE TABLE devices (
     fingerprint VARCHAR(64) PRIMARY KEY,
     profile_count INTEGER DEFAULT 0,
     is_pro_device BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP
   );
   ```

3. **Profile Limits**
   - Check device on profile creation
   - Block if free device has profile
   - Show clear upgrade message

### Phase 2: Payments (Week 2)
1. **Stripe Integration**
   - Single product: Lokals Pro
   - Monthly billing only (simplify)
   - Webhook for status updates

2. **Subscription Features**
   - Unlock device on payment
   - Enable profile switching
   - Add verified badge

### Phase 3: Polish (Week 3)
1. **UI/UX Improvements**
   - Smooth profile switcher
   - Clear Pro benefits display
   - Non-intrusive upgrade prompts

2. **Edge Cases**
   - Handle fingerprint changes
   - Shared device considerations
   - Subscription recovery

## Privacy & Security

### Our Commitments
1. **No PII Required**: No email, phone, or real name needed
2. **Device Data**: Hashed fingerprints only, no raw data stored
3. **Payment Privacy**: Stripe handles cards, we never see them
4. **No Tracking**: Device ID not used for ads or analytics
5. **Data Deletion**: Can request device data removal

### Disclosures
- "We use device fingerprinting to enforce fair usage limits"
- "Pro subscription is tied to your device, not account"
- "Clearing browser data won't create new free profile"

## Revenue Projections

### Assumptions
- 10,000 monthly active users
- 5% conversion to Pro = 500 subscribers
- $6.99/month × 500 = $3,495 MRR
- Low churn (anonymous chat is sticky)

### Growth Tactics
1. **Viral Features**: "Invite to private room" (Pro only)
2. **FOMO**: "3 Pro users in your area"
3. **Limited Offers**: "First month $3.99"
4. **Social Proof**: Show Pro badges prominently

## Why This Will Work

### For Users
- **Free users**: Still get core chat experience
- **Pro users**: Feel special, more invested
- **Privacy-conscious**: No email/phone required
- **Simple**: One decision - Free or Pro

### For Business
- **Low support**: Device-based is automatic
- **Fair**: Prevents abuse without being harsh
- **Scalable**: No manual verification
- **Clear value**: Easy to explain benefits

## Launch Strategy

### Soft Launch (Week 1)
- Enable fingerprinting only
- Monitor device patterns
- No payment yet

### Payment Launch (Week 2)
- Enable Stripe
- Early bird pricing ($4.99 first month)
- Grandfather existing users

### Marketing Push (Week 3+)
- "Pro launch celebration"
- Referral bonuses
- Press outreach

## Success Metrics

### Week 1
- Device fingerprint accuracy: >95%
- False positive rate: <1%
- User complaints: <10

### Month 1
- Conversion rate: 3-5%
- MRR: $1,000+
- Churn: <10%

### Month 3
- Conversion rate: 5-8%
- MRR: $3,000+
- Pro user retention: >90%

## FAQ Preparation

**Q: Why can't I create another profile?**
A: Free users get one profile per device. Upgrade to Pro for unlimited profiles!

**Q: What if I share my computer?**
A: Each person should use their own device, or consider Pro for multiple profiles.

**Q: Can I transfer my subscription?**
A: Subscriptions are tied to devices for security. Cancel and resubscribe on new device.

**Q: What happens if I clear cookies?**
A: Your profile is tied to your device, not cookies. You'll still have the same limits.

**Q: Is my payment info safe?**
A: Yes! We use Stripe and never see your card details.