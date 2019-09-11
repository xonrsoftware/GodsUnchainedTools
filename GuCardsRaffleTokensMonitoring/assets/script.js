let status;
document.addEventListener("DOMContentLoaded", async () => {
    status = document.getElementById("status");
    tableMain = $('.sortable').DataTable({
        "order": [
            [2, "asc"]
        ],
        paging: false
    });

});

function chunkArray(myArray, chunk_size) {
    var index = 0;
    var arrayLength = myArray.length;
    var tempArray = [];

    for (index = 0; index < arrayLength; index += chunk_size) {
        myChunk = myArray.slice(index, index + chunk_size);
        // Do something if you want with the group
        tempArray.push(myChunk);
    }

    return tempArray;
}
let objectoflistings = [];
let disabledCachedIDS = [];
async function workWithChunk(idsToWork, Coursetro) {
    for (let i of idsToWork) {
        if (disabledCachedIDS.includes(i)) continue;
        let tx = await Coursetro.methods.listingsById(i).call();
        if (tx[2] > 0) {
            let balance = await getERC20TokenBalance("0x0c8cdc16973e88fab31dd0fcb844ddf0e1056de2", tx[3]);
            if (balance > 0 && tx[4] === true) {
                let allowance = await getAllowance(tx[3], '0x486C2816703B3D76BB77ab72711646f4E83d6c10');
                objectoflistings.push({
                    "id": i,
                    "user": tx[3],
                    "price": web3.utils.fromWei(tx[0], "ether"),
                    "totaltokens": tx[1],
                    "lefttokens": tx[2],
                    "tokenuserwalletbalance": balance,
                    "allowance": allowance
                });
            } else if (tx[4] === false) {
                disabledCachedIDS.push(i);
            }
        }
    }
}
async function startLoop(rate) {
    document.getElementById("singleRefresh").style.display = "none";
    document.getElementById("startLoop").style.display = "none";
    while (true) {
        try {
            await startWork();
            await sleep(rate);
        } catch (err) {
            alert("Error:" + err);
            break;
        }
    }
}
async function SingleRefresh() {
    document.getElementById("singleRefresh").style.display = "none";
    document.getElementById("startLoop").style.display = "none";
    try {
        await startWork();
    } catch (err) {
        alert("Error:" + err);
    }
    document.getElementById("singleRefresh").style.display = "";
    document.getElementById("startLoop").style.display = "";
}
async function startWork() {
    status.innerHTML = "Loading.";
    if (typeof web3 !== 'undefined') {
        web3 = new Web3(web3.currentProvider);
    } else {
        // set the provider you want from Web3.providers
        web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
    }
    web3.eth.defaultAccount = web3.eth.accounts[0];
    let Coursetro = new web3.eth.Contract(jsongudeckscontractabi, '0x486C2816703B3D76BB77ab72711646f4E83d6c10');

    let lastid = await Coursetro.methods.nextListingId().call();

    objectoflistings = [];

    let breakff = false;

    let filledIDS = [];
    for (let i = lastid; i >= 0; i--) {
        filledIDS.push(i);
    }
    let waitingAsync = [];
    let chunkedIDS = chunkArray(filledIDS, Math.ceil(filledIDS.length / 50));
    for (let chunk of chunkedIDS) {
        waitingAsync.push(workWithChunk(chunk, Coursetro));
    }
    await Promise.all(waitingAsync);
    status.innerHTML = "Done, refreshing in 5 seconds.";
    //while (true) {


    generateTable(document.querySelector("table"), objectoflistings);
    //console.log(objectoflistings);
    //   await sleep(5000);
    //}
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAllowance(owner, spender, callback) {
    let contract = new web3.eth.Contract(godsunchainedtokensabi, '0x0c8cdc16973e88fab31dd0fcb844ddf0e1056de2');
    return await contract.methods.allowance(owner, spender).call();
}

let tableMain = undefined;

function delTable(table) {
    if (tableMain !== undefined) tableMain.destroy();
    var rowstoDelete = table.querySelectorAll("tbody tr");
    [].slice.call(rowstoDelete).forEach(function (row) {
        row.remove()
    });
}

function generateTable(table, data) {
    let order = tableMain.order();
    let search = tableMain.search();

    delTable(table);
    for (let element of data) {
        let row = table.getElementsByTagName('tbody')[0].insertRow();
        for (key in element) {
            let cell = row.insertCell();
            let text = document.createTextNode(element[key]);
            cell.appendChild(text);
        }
    }
    tableMain = $('.sortable').DataTable({
        order: order,
        "search": {
            "search": search
        },
        paging: false
    });
}

async function getERC20TokenBalance(tokenAddress, walletAddress) {

    // ERC20 トークンの残高を取得するための最小限のABI
    let minABI = [
        // balanceOf
        {
            "constant": true,
            "inputs": [{
                "name": "_owner",
                "type": "address"
            }],
            "name": "balanceOf",
            "outputs": [{
                "name": "balance",
                "type": "uint256"
            }],
            "type": "function"
        },
        // decimals
        {
            "constant": true,
            "inputs": [],
            "name": "decimals",
            "outputs": [{
                "name": "",
                "type": "uint8"
            }],
            "type": "function"
        }
    ];
    let contract = new web3.eth.Contract(minABI, tokenAddress);
    let balance = await contract.methods.balanceOf(walletAddress).call();
    let decimals = await contract.methods.decimals().call();

    return balance / Math.pow(10, decimals);
}