export { sendEmail, type EmailMessage, type SendResult } from "./send";
export {
  scanSummaryEmail,
  failureAlertEmail,
  downAlertEmail,
  recoveryAlertEmail,
  sslExpiryAlertEmail,
  weeklyReportEmail,
  type Severity,
  type ChangeLine,
  type ScanSummaryData,
  type FailureAlertData,
  type DownAlertData,
  type RecoveryAlertData,
  type SslExpiryAlertData,
  type WeeklyReportData,
  type WeeklySeverityCount,
  type WeeklyLighthouseScores,
} from "./templates";
