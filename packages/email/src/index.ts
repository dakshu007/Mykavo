export { sendEmail, type EmailMessage, type SendResult } from "./send";
export {
  scanSummaryEmail,
  failureAlertEmail,
  downAlertEmail,
  recoveryAlertEmail,
  sslExpiryAlertEmail,
  type Severity,
  type ChangeLine,
  type ScanSummaryData,
  type FailureAlertData,
  type DownAlertData,
  type RecoveryAlertData,
  type SslExpiryAlertData,
} from "./templates";
