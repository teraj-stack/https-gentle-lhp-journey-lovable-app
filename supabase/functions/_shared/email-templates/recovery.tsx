/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>Zresetuj hasło — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>CML Centrum Medycyny Laserowej</Text>
        <Hr style={divider} />
        <Heading style={h1}>Resetowanie hasła</Heading>
        <Text style={text}>
          Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w {siteName}. Kliknij przycisk poniżej, aby ustawić nowe hasło.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Ustaw nowe hasło
        </Button>
        <Hr style={divider} />
        <Text style={footer}>
          Jeśli nie prosiłeś/aś o reset hasła, zignoruj tę wiadomość. Twoje hasło pozostanie bez zmian.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const logo = { fontSize: '13px', fontWeight: '600' as const, color: '#c9a84c', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 16px' }
const divider = { borderColor: '#e8e0d0', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1d24', margin: '0 0 20px', fontFamily: "'Cormorant Garamond', Georgia, serif" }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: '#c9a84c', color: '#1a1d24', fontSize: '14px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
