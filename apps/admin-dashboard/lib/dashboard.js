export const dashboardSnapshot = {
  asOf: "Today, 10:42 IST",
  dataLabel: "Synthetic demonstration data",
  kpis: [
    { label: "New complaints", value: "18,421", change: "+18%", tone: "coral" },
    { label: "Systemic issues", value: "147", change: "+12", tone: "teal" },
    { label: "High-severity issues", value: "23", change: "+4", tone: "yellow" },
    { label: "Potential fraud clusters", value: "11", change: "+2", tone: "ink" },
  ],
  issues: [
    { rank: 1, title: "Refund delays", sector: "E-commerce", growth: "+240%", reports: "4,381", priority: "High" },
    { rank: 2, title: "Warranty rejection", sector: "Consumer durables", growth: "+182%", reports: "3,908", priority: "High" },
    { rank: 3, title: "Hidden charges", sector: "Digital services", growth: "+141%", reports: "2,884", priority: "Medium" },
    { rank: 4, title: "Fake listings", sector: "E-commerce", growth: "+109%", reports: "2,112", priority: "Medium" },
    { rank: 5, title: "Subscription traps", sector: "Digital services", growth: "+94%", reports: "1,740", priority: "Medium" },
  ],
  sectors: [
    { name: "E-commerce", value: 42, color: "coral" },
    { name: "Digital payments", value: 27, color: "teal" },
    { name: "Banking", value: 19, color: "yellow" },
    { name: "Telecom", value: 12, color: "blue" },
  ],
};

export function dashboardSummary(snapshot = dashboardSnapshot) {
  return {
    totalKpis: snapshot.kpis.length,
    topIssue: snapshot.issues[0].title,
    totalSectorShare: snapshot.sectors.reduce((total, sector) => total + sector.value, 0),
    isSynthetic: snapshot.dataLabel.toLowerCase().includes("synthetic"),
  };
}