
export function setUserGroups(userGroups, activeGroupId, onChange) {
  const groupsList = document.getElementById('user-groups-list');
  const currentText = document.getElementById('current-group');
  const username = document.getElementById('discord-username')?.textContent ?? 'User';

  if (!groupsList || !currentText) return;

  document.getElementById("user-popover").querySelectorAll(".hidden").forEach(el => el.classList.remove("hidden"))

  // Clear UI
  groupsList.innerHTML = '';

  /**
   * Helper to activate a group
   */
  function activate(groupId: string, label: string) {
    const normalizedGroupId = groupId === 'user' ? null : groupId;

    activeGroupId = groupId;
    localStorage.setItem('activeGroupId', groupId);

    // Update current label
    currentText.textContent = label;

    // Update active class
    groupsList.querySelectorAll('.active-group').forEach(el => el.classList.remove('active-group'));

    const activeEl = groupsList.querySelector(`[data-group-id="${groupId}"]`);
    activeEl?.classList.add('active-group');
    onChange(normalizedGroupId)
  }

  /**
   * Helper to create a menu entry
   */
  function createEntry(id: string, label: string) {
    const a = document.createElement('a');
    a.textContent = label;
    a.title = label;
    a.dataset.groupId = id;
    a.classList.add("user-group-link");

    a.addEventListener('click', () => activate(id, label));

    return a;
  }

  // ---- USER (self) ENTRY ----
  const userEntry = createEntry('user', username);
  groupsList.appendChild(userEntry);

  // ---- GROUP ENTRIES ----
  for (const group of userGroups) {
    const entry = createEntry(group.id, group.name);
    groupsList.appendChild(entry);
  }

  // ---- INITIAL ACTIVE STATE ----
  if (!activeGroupId) {
    activate('user', username);
  } else {
    const active =
      activeGroupId === 'user'
        ? username
        : userGroups.find(g => g.id === activeGroupId)?.name;

    if (active) {
      activate(activeGroupId, active);
    }
  }
}
