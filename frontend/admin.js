addListeners(document)
let dragElement = null

function addListeners(target) {
  const deleteRowButtons = target.getElementsByClassName('deleteRow')
  for (const button of deleteRowButtons) {
    if (button.dataset.clickAdded) {
      continue
    }
    button.dataset.clickAdded = 'true'
    button.addEventListener('click', (event) => {
      event.preventDefault()
      button.parentElement.remove()
    })
  }

  const addRowButtons = target.getElementsByClassName('addRow')
  for (const button of addRowButtons) {
    if (button.dataset.clickAdded) {
      continue
    }
    button.dataset.clickAdded = 'true'
    button.addEventListener('click', (event) => {
      event.preventDefault()
      const templateId = button.dataset.templateId
      const newRow = document.getElementById(templateId).content.cloneNode(true)
      button.parentElement.before(newRow)
      addListeners(button.parentElement.previousElementSibling)
      if (templateId.startsWith('discord-role-add')) {
        changeInputNames(button.parentElement.parentElement.getElementsByClassName('discordId')[0])
      }
    })
  }

  const discordIds = target.getElementsByClassName('discordId')
  for (const discordIdInput of discordIds) {
    if (discordIdInput.dataset.changeadded) {
      continue
    }
    discordIdInput.dataset.changeadded = 'true'
    discordIdInput.addEventListener('change', (event) => {
      changeInputNames(discordIdInput)
    })
  }

  const draftRow = target.classList && target.classList.contains('draftRow') ? [target] : target.getElementsByClassName('draftRow')
  for (const row of draftRow) {
    const select = row.getElementsByTagName('select')[0]
    const draftUser = row.getElementsByClassName('draftUser')[0]
    function updateDraftRows() {
      if (select.value === '') {
        draftUser.style.display = null
      }
      else {
        draftUser.style.display = 'none'
      }
      const draftRows = document.querySelectorAll('.draftRow select');
      const selected = []
      draftRows.forEach((otherSelects) => {
        if (otherSelects.value !== '') {
          selected.push(otherSelects.value)
        }
      });
      draftRows.forEach((otherSelects) => {
        otherSelects.querySelectorAll('option').forEach((option) => {
          if (selected.includes(option.value) && otherSelects.value !== option.value) {
            option.disabled = true
          }
          else {
            option.disabled = false
          }
        });
      })
    }
    updateDraftRows()
    select.addEventListener('change', updateDraftRows);
    row.draggable = true
    row.addEventListener('dragstart', (event) => {
      dragElement = row;
      row.classList.add('dragging')
    })
    row.addEventListener('dragend', (event) => {
      row.classList.remove('dragging')
    })
  }
}

const dropzone = document.getElementById('draftDropzone')
dropzone.addEventListener('dragenter', (event) => {
  event.preventDefault();
})
dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  let siblings = [ ...dropzone.querySelectorAll(".draftRow:not(.dragging)") ];
  let nextSibling = siblings.find( sibling => {
    return event.clientY <= sibling.offsetTop + sibling.offsetHeight
  })
  dropzone.insertBefore(dragElement, nextSibling);
})
dropzone.addEventListener('drop', (event) => {
  dragElement = null
})


function changeInputNames(discordIdInput) {
  const changeNeeded = discordIdInput.parentElement.parentElement.getElementsByClassName('discordIdChange')
  for (const input of changeNeeded) {
    input.name = input.name.replace(/\[discords\]\[\d*\]/, `[discords][${discordIdInput.value}]`)
  }
}