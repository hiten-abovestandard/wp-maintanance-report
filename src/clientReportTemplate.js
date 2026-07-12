function monthYear(reportDateISO) {
  const d = new Date(`${reportDateISO}T00:00:00`);
  return d.toLocaleString("default", { month: "long", year: "numeric" });
}

export function buildClientReportBody(data, reportDateISO) {
  const updatedPlugins = (data.updatedPlugins || []).filter(p => p.name?.trim());
  const themes = (data.themes || []).filter(t => t.name?.trim());
  const hasCore = data.wpFrom?.trim() && data.wpTo?.trim();
  const hasAnything = updatedPlugins.length || themes.length || hasCore;

  const lines = [];
  const l = (s = "") => lines.push(s);

  l(`Monthly Maintenance Summary – ${monthYear(reportDateISO)}`);
  l();

  if (!hasAnything) {
    l("Your website was reviewed this month and everything is confirmed up to date and running smoothly.");
    return lines.join("\n");
  }

  l("The following maintenance activities were completed on your website this month:");
  l();

  if (updatedPlugins.length) {
    l("Plugin Updates");
    updatedPlugins.forEach(p => l(`• ${p.name}`));
    l("All plugins were updated to their latest, secure versions.");
    l();
  }

  if (themes.length) {
    l("Theme Updates");
    themes.forEach(t => l(`• ${t.name}`));
    l();
  }

  if (hasCore) {
    l("WordPress Core");
    l(`Updated to WordPress ${data.wpTo}.`);
    l();
  }

  l("Your website has been tested after these updates and is running smoothly.");

  return lines.join("\n");
}
