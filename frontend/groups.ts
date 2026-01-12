import { render } from "nunjucks";

interface Group {
  id: string;
  name: string;

  individual_members?: Record<
    string,
    {
      id: string;
      username?: string;
    }
  >;

  discord_roles?: Record<
    string,
    {
      role: string;
      server: string;
      info?: string;
    }
  >;

  permissions?: Record<string, boolean>;
}

interface GroupsFile {
  users: {
    [userId: string]: {
      groups: Record<string, Group>;
      hash: string;
    };
  };
}


class Groups {

    constructor() {
        this.init();
        this.bindUI();
    }

    async init() {
        this.groupsData = await this.loadGroups();
        this.renderGroups();
    }

    async loadGroups() {
        const res = await fetch("/api/groups");
        return res.json();
    }

    renderGroups() {
        if (!this.groupsData) return;

        const list = document.getElementById('group-editor');
        const panels = document.querySelector(".tab-content");
        const template = document.getElementById("group-editor-template") as HTMLTemplateElement;
        list.innerHTML = '';
        panels.querySelectorAll(".tab-pane[data-group-id]").forEach(p => p.remove());

        for (const id in this.groupsData.groups) {
            const group = this.groupsData.groups[id];
            // Left side group list
            const btn = document.createElement('button');
            btn.className = 'list-group-item list-group-item-action groupList';
            btn.textContent = group.name;
            btn.setAttribute('data-bs-toggle', 'list');
            btn.setAttribute('data-bs-target', `#group-${group.id}`);
            btn.type = 'button';
            btn.addEventListener('click', (e) => {
                document.getElementById('create-group').classList.remove('active');
            });

            list.appendChild(btn);
            // Right side group editing panel
            const panel = template.content.cloneNode(true) as DocumentFragment;
            const root = panel.querySelector(".tab-pane")!;
            root.id = `group-${group.id}`;
            root.dataset.groupId = group.id;

            root.querySelector("h4")!.textContent = group.name;
            (root.querySelector("#group-name") as HTMLInputElement).value = group.name;

            this.renderGroupMembers(group, root);
            this.renderGroupRoles(group, root);

            root.querySelectorAll("button[data-group-id]").forEach(button => {
                button.setAttribute('data-group-id', group.id);
            });

            root.querySelector("#add-member-btn")!.addEventListener('click', async () => {
                const memberIdInput = root.querySelector("#add-member") as HTMLInputElement;
                const memberNoteInput = root.querySelector("#add-member-note") as HTMLInputElement;
                const memberId = memberIdInput.value.trim();
                const memberNote = memberNoteInput.value.trim();
                const newData = this.groupsData;
                memberIdInput.value = '';
                memberNoteInput.value = '';
                if (!memberId) return;
                newData.groups[group.id].individual_members[memberId] = {id: memberId, username: memberNote || undefined};
                const res = await fetch(`/api/groups/${group.id}`, {
                    method: "PUT",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({individual_members: newData.groups[group.id].individual_members})
                });
                const groupsFile = await res.json();
                this.groupsData = groupsFile;
                this.renderGroupMembers(groupsFile.groups[group.id], root);
            });

            root.querySelector("#add-role-btn")!.addEventListener('click', async () => {
                const serverIdInput = root.querySelector("#add-server") as HTMLInputElement;
                const roleIdInput = root.querySelector("#add-role") as HTMLInputElement;  
                const roleNoteInput = root.querySelector("#add-role-note") as HTMLInputElement;
                const serverId = serverIdInput.value.trim();
                const roleId = roleIdInput.value.trim();
                const roleNote = roleNoteInput.value.trim();
                const newData = this.groupsData;
                serverIdInput.value = '';
                roleIdInput.value = '';
                roleNoteInput.value = '';
                if (!serverId || !roleId) return;
                newData.groups[group.id].discord_roles[roleId] = {role: roleId, server: serverId, info: roleNote || undefined};
                const res = await fetch(`/api/groups/${group.id}`, {
                    method: "PUT",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({discord_roles: newData.groups[group.id].discord_roles})
                });
                const groupsFile = await res.json();
                this.groupsData = groupsFile;
                this.renderGroupRoles(groupsFile.groups[group.id], root);
            });

            root.querySelector("#delete-group-btn")!.addEventListener('click', async () => {
                if (!confirm(`Are you sure you want to delete the group "${group.name}"? This action cannot be undone.`)) return;
                const res = await fetch(`/api/groups/${group.id}`, {method: "DELETE"});
                const groupsFile = await res.json();
                this.groupsData = groupsFile;
                this.renderGroups();
            });

            panels.appendChild(panel);
        }
        console.log("Groups rendered");
    };

    renderGroupMembers(group: Group, root: HTMLElement) {
        const memberList = root.querySelector("#member-list") as HTMLElement;
        memberList.innerHTML = '';
        for (const member_id in group.individual_members || []) {
            const memberItemTemplate = document.getElementById("member-list-item-template") as HTMLTemplateElement;
            const memberItem = memberItemTemplate.content.cloneNode(true) as DocumentFragment;
            const member_name = group.individual_members[member_id]?.username;
            (memberItem.querySelector(".member-info") as HTMLElement).textContent = (member_name ?  member_name + " - " : "") + member_id;
            (memberItem.querySelector(".remove-member-btn") as HTMLButtonElement).dataset.memberId = member_id;
            memberItem.querySelector(".remove-member-btn")!.addEventListener('click', async () => {
                const newData = this.groupsData;
                delete newData.groups[group.id].individual_members[member_id];
                const res = await fetch(`/api/groups/${group.id}`, {
                    method: "PUT",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({individual_members: newData.groups[group.id].individual_members})
                });
                const groupsFile = await res.json();
                this.groupsData = groupsFile;
                this.renderGroupMembers(groupsFile.groups[group.id], root);
            });
            memberList.appendChild(memberItem);
        }
    }

    renderGroupRoles(group: Group, root: HTMLElement) {
        const roleList = root.querySelector("#role-list") as HTMLElement;
        roleList.innerHTML = '';
        for (const discord_role in group.discord_roles || []) {
            const roleItemTemplate = document.getElementById("role-list-item-template") as HTMLTemplateElement;
            const roleItem = roleItemTemplate.content.cloneNode(true) as DocumentFragment;
            const role_name = group.discord_roles[discord_role]?.info;
            (roleItem.querySelector(".role-info") as HTMLElement).textContent = (role_name ? role_name + " - " : "") + "Role ID: " + discord_role + " Server ID: " + group.discord_roles[discord_role]?.server;
            (roleItem.querySelector(".remove-role-btn") as HTMLButtonElement).dataset.roleId = discord_role;
            roleItem.querySelector(".remove-role-btn")!.addEventListener('click', async () => {
                const newData = this.groupsData;
                delete newData.groups[group.id].discord_roles[discord_role];
                const res = await fetch(`/api/groups/${group.id}`, {
                    method: "PUT",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({discord_roles: newData.groups[group.id].discord_roles})
                });
                const groupsFile = await res.json();
                this.groupsData = groupsFile;
                this.renderGroupRoles(groupsFile.groups[group.id], root);
            });
            roleList.appendChild(roleItem);
        }
    }

    async addGroup(data: Omit<Group, "id">) {
        if (data.name.trim() === "") {
            alert("Group name cannot be empty");
            return;
        }
        const res = await fetch("/api/groups", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(data)});
        const groupsFile = await res.json();
        this.groupsData = groupsFile;
        this.renderGroups();
    }

    bindUI(groupRerender = false) {
        const target = (document.getElementById('new-group-btn') as HTMLElement).dataset.target;
        const groupsList = document.querySelectorAll("button.list-group-item.list-group-item-action.groupList");
        document.getElementById('new-group-btn').addEventListener('click', () => {
            if (!target) return;
            this.showPanel(target);
            document.querySelectorAll('.tab-pane.fade').forEach(element => {
                element.classList.remove('active', 'show');
            });
            groupsList.forEach(element => {
                element.classList.remove('active');
            });
        });
        document.getElementById('create-group-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            this.addGroup({
                name: (document.getElementById('group-name') as HTMLInputElement).value
            });
        });
    }

    showPanel(target: string) {
        document.querySelectorAll('.group-panel').forEach(p =>
        p.classList.toggle('active')
        );
    }

}

new Groups();