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
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface EmailChangeEmailProps {
  siteName: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  email,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <Html lang="pl" dir="ltr">
    <Head />
    <Preview>Potwierdź zmianę adresu e-mail — {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>CML Centrum Medycyny Laserowej</Text>
        <Hr style={divider} />
        <Heading style={h1}>Potwierdź zmianę adresu e-mail</Heading>
        <Text style={text}>
          Złożono prośbę o zmianę adresu e-mail w {siteName} z{' '}
          <Link href={`mailto:${email}`} style={linkStyle}>
            {email}
          </Link>{' '}
          na{' '}
          <Link href={`mailto:${newEmail}`} style={linkStyle}>
            {newEmail}
          </Link>
          .
        </Text>
        <Text style={text}>
          Kliknij przycisk poniżej, aby potwierdzić zmianę:
        </Text>
        <Button style={button} href={confirmationUrl}>
          Potwierdź zmianę e-mail
        </Button>
        <Hr style={divider} />
        <Text style={footer}>
          Jeśli nie prosiłeś/aś o tę zmianę, zabezpiecz swoje konto niezwłocznie.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default EmailChangeEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const logo = { fontSize: '13px', fontWeight: '600' as const, color: '#c9a84c', letterSpacing: '0.12em', textTransform: 'uppercase' as const, margin: '0 0 16px' }
const divider = { borderColor: '#e8e0d0', margin: '20px 0' }
const h1 = { fontSize: '22px', fontWeight: '700' as const, color: '#1a1d24', margin: '0 0 20px', fontFamily: "'Cormorant Garamond', Georgia, serif" }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.6', margin: '0 0 16px' }
const linkStyle = { color: '#c9a84c', textDecoration: 'underline' }
const button = { backgroundColor: '#c9a84c', color: '#1a1d24', fontSize: '14px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '24px 0 0' }
