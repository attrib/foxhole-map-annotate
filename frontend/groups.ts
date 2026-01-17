import { blinkInput } from "./tools/errorBlink";
import type { Group } from "../lib/Groups/types.ts";

/* =======================
   Groups UI Controller
======================= */

class Groups {
  private groupsData: any;

  constructor() {
    this.init();
    this.bindUI();
  }

  /* =======================
     Init & Data
  ======================= */

  async init() {
    this.groupsData = await this.loadGroups();
    this.renderGroups();
  }

  async loadGroups() {
    const res = await fetch("/api/groups");
    return res.json();
  }

  /* =======================
     Rendering
  ======================= */

  renderGroups() {
    if (!this.groupsData) return;

    const list = document.getElementById("group-editor")!;
    const panels = document.querySelector(".tab-content")!;
    const template = document.getElementById("group-editor-template") as HTMLTemplateElement;

    const activeGroupId = this.getActiveGroupId();

    list.innerHTML = "";
    panels.querySelectorAll(".tab-pane[data-group-id]").forEach(p => p.remove());
    console.log(this.groupsData.groups);
    for (const group of Object.values(this.groupsData.groups)) {
      const button = this.createGroupButton(group);
      const panel = this.createGroupPanel(group, template);

      list.appendChild(button);
      panels.appendChild(panel);
    }

    if (activeGroupId) {
      document
        .querySelector<HTMLElement>(`[data-bs-target="#group-${activeGroupId}"]`)
        ?.click();
    }

    console.log("Groups rendered");
  }

  getActiveGroupId(): string | null {
    const active = document.querySelector<HTMLElement>(
      "#group-editor .list-group-item.active"
    );
    return active?.dataset.bsTarget?.replace("#group-", "") ?? null;
  }

  /* =======================
     Group Button
  ======================= */

  createGroupButton(group: Group): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "list-group-item list-group-item-action groupList";
    btn.textContent = group.name;
    btn.type = "button";
    btn.dataset.bsToggle = "list";
    btn.dataset.bsTarget = `#group-${group.id}`;

    btn.addEventListener("click", () => {
      document.getElementById("create-group")?.classList.remove("active");
    });

    return btn;
  }

  /* =======================
     Group Panel
  ======================= */

  createGroupPanel(group: Group, template: HTMLTemplateElement): HTMLElement {
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    const root = fragment.querySelector(".tab-pane") as HTMLElement;

    root.id = `group-${group.id}`;
    root.dataset.groupId = group.id;

    this.setupGroupName(group, root);
    this.setupMemberControls(group, root);
    this.setupRoleControls(group, root);
    this.setupDeleteGroup(group, root);

    this.renderGroupMembers(group, root);
    this.renderGroupRoles(group, root);

    return root;
  }

  setupGroupName(group: Group, root: HTMLElement) {
    const nameInput = root.querySelector<HTMLInputElement>("#group-name")!;
    const title = root.querySelector("h4")!;

    nameInput.value = group.name;
    title.textContent = group.name;

    nameInput.addEventListener("blur", async () => {
      const newName = nameInput.value.trim();
      if (!this.validateGroupName(newName, group, nameInput, root)) return;

      await this.updateGroup(group.id, { name: newName });
      title.textContent = newName;
    });
  }

  setupMemberControls(group: Group, root: HTMLElement) {
    const addBtn = root.querySelector("#add-member-btn")!;
    const memberId = root.querySelector<HTMLInputElement>("#add-member")!;
    const memberNote = root.querySelector<HTMLInputElement>("#add-member-note")!;

    addBtn.addEventListener("click", async () => {
      const memberIdVal = memberId.value.trim();
      if (!memberIdVal) return;

      await this.updateGroup(group.id, {
        individual_members: {
          ...(this.groupsData.groups[group.id].individual_members ?? {}),
          [memberIdVal]: { id: memberIdVal, username: memberNote.value.trim() },
        },
      });
      memberId.value = "";
      memberNote.value = "";
      this.renderGroupMembers(this.groupsData.groups[group.id], root);
    });
  }

  setupRoleControls(group: Group, root: HTMLElement) {
    const addBtn = root.querySelector("#add-role-btn")!;
    const roleId = root.querySelector<HTMLInputElement>("#add-role")!;
    const serverId = root.querySelector<HTMLInputElement>("#add-server")!;
    const roleNote = root.querySelector<HTMLInputElement>("#add-role-note")!;
    addBtn.addEventListener("click", async () => {
      const roleIdVal = roleId.value.trim();
      const serverIdVal = serverId.value.trim();
      if (!roleIdVal || !serverIdVal) return;
        await this.updateGroup(group.id, {
        discord_roles: {
          ...(this.groupsData.groups[group.id].discord_roles ?? {}),
          [roleIdVal]: {
            role: roleIdVal,
            server: serverIdVal,
            info: roleNote.value.trim(),
            },
        },
      });
        roleId.value = "";
        serverId.value = "";
        roleNote.value = "";
        this.renderGroupRoles(this.groupsData.groups[group.id], root);
    });
  }
  
  validateGroupName(
    name: string,
    group: Group,
    input: HTMLInputElement,
    root: HTMLElement
  ): boolean {
    if (!name || name === group.name) return false;

    const exists = Object.values(this.groupsData.groups).some(
      g => g.name.toLowerCase() === name.toLowerCase() && g.id !== group.id
    );

    if (exists) {
      blinkInput(input);
      root.querySelector<HTMLElement>("#existing-group-name-error")!.style.display = "inline";
      return false;
    }

    return true;
  }

  /* =======================
     Members
  ======================= */

  renderGroupMembers(group: Group, root: HTMLElement) {
    const list = root.querySelector("#member-list")!;
    list.innerHTML = "";

    for (const [id, member] of Object.entries(group.individual_members ?? {})) {
      const item = this.createMemberItem(group, id, member?.username, root);
      list.appendChild(item);
    }
  }

  createMemberItem(group: Group, id: string, username?: string, root?: HTMLElement) {
    const template = document.getElementById("member-list-item-template") as HTMLTemplateElement;
    const fragment = template.content.cloneNode(true) as DocumentFragment;

    fragment.querySelector(".member-info")!.textContent =
      `${username ? username + " - " : ""}${id}`;

    fragment.querySelector(".remove-member-btn")!
      .addEventListener("click", () => this.removeMember(group, id, root!));

    return fragment;
  }

  async removeMember(group: Group, memberId: string, root: HTMLElement) {
    delete this.groupsData.groups[group.id].individual_members[memberId];
    await this.updateGroup(group.id, {
      individual_members: this.groupsData.groups[group.id].individual_members,
    });
    this.renderGroupMembers(this.groupsData.groups[group.id], root);
  }

  /* =======================
     Roles
  ======================= */

  renderGroupRoles(group: Group, root: HTMLElement) {
    const list = root.querySelector("#role-list")!;
    list.innerHTML = "";

    for (const [roleId, role] of Object.entries(group.discord_roles ?? {})) {
      const template = document.getElementById("role-list-item-template") as HTMLTemplateElement;
      const fragment = template.content.cloneNode(true) as DocumentFragment;

      fragment.querySelector(".role-info")!.textContent =
        `${role.info ? role.info + " - " : ""}Role ID: ${roleId} Server ID: ${role.server}`;

      fragment.querySelector(".remove-role-btn")!
        .addEventListener("click", () => this.removeRole(group, roleId, root));

      list.appendChild(fragment);
    }
  }

  async removeRole(group: Group, roleId: string, root: HTMLElement) {
    delete this.groupsData.groups[group.id].discord_roles[roleId];
    await this.updateGroup(group.id, {
      discord_roles: this.groupsData.groups[group.id].discord_roles,
    });
    this.renderGroupRoles(this.groupsData.groups[group.id], root);
  }

  /* =======================
     Actions
  ======================= */

  async updateGroup(groupId: string, body: object) {
    const res = await fetch(`/api/groups/${groupId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    this.groupsData = await res.json();
  }

  setupDeleteGroup(group: Group, root: HTMLElement) {
    root.querySelector("#delete-group-btn")!.addEventListener("click", async () => {
      if (!confirm(`Delete "${group.name}" permanently?`)) return;

      const res = await fetch(`/api/groups/${group.id}`, { method: "DELETE" });
      this.groupsData = await res.json();
      this.renderGroups();
    });
  }

  /* =======================
     UI Binding
  ======================= */

  bindUI() {
    document.getElementById("new-group-btn")!
      .addEventListener("click", () => document.getElementById("create-group")?.classList.add("active"));
    document.getElementById("create-group-form")!
      .addEventListener("submit", async e => {
        e.preventDefault();
        await this.addGroup();
      });
  }

  async addGroup() {
    const input = document.getElementById("group-name") as HTMLInputElement;
    const name = input.value.trim();

    if (!name) {
      blinkInput(input);
      return;
    }

    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    this.groupsData = await res.json();
    this.renderGroups();
  }
}

/* =======================
   Start
======================= */

new Groups();
