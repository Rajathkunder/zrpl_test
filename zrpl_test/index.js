
import express, { request } from "express";
import bodyParser from "body-parser";

//import _, { fill } from 'lodash'
import axios from 'axios';

const path = import('path');
const app = express();





//app.use(express.static(path.join(__dirname, 'public')));  test test
app.use(express.static('public'));


app.use(bodyParser.json());

app.get("/", (req, res, next) => {

  res.json({ message: "from index api" });


});

const ackData = {
  "ack": { "status": "ACK" }
}
//chamges done to this
let networkContext = {
  "domain": process.env.DOMAIN,
  "action": "on_search",
  "core_version": "1.1.0",
  "bap_id": "buyer-app.ondc.org",
  "bap_uri": "https://buyer-app.ondc.org/protocol/v1",
  "transaction_id": "body.context.transaction_id",
  "message_id": "body.context.message_id",
  "city": "std:080",
  "country": "IND",
  "timestamp": "new Date().toISOString()",
  "bpp_id": process.env.BAP_ID,
  "bpp_uri": process.env.BPP_URI,
  "ttl":"PT30S"
};

let bppContext = {
  "transaction_id": "body.context.transaction_id",
  "message_id": "body.context.message_id",
  "bap_id": "buyer-app.ondc.org",
  "bap_uri": "https://buyer-app.ondc.org/protocol/v1",
  "domain": process.env.DOMAIN,
  "country": "IND",
  "city": "std:080",
  "core_version": "1.1.0",
  "bpp_id": process.env.BAP_ID,
  "bpp_uri": process.env.BPP_URI,
  "ttl":"PT30S",
  
  "action": "on_select",
  "timestamp": "new Date().toISOString()",
}
//-------------------------------------------------------
//code for generating bearer token for api authorization

let deliveryCharge = 0;

export const getToken = async () => {
    
    let data = JSON.stringify({
    "username": "samsung",
    "password": "gourav@123G"
    });

    let config = {
    method: 'post',
    url: 'https://tataepp.stagingshop.com/rest/all/V1/integration/admin/token?username=epppartner&password=epp@123E',
    headers: { 
        'Content-Type': 'application/json', 
        'Cookie': 'PHPSESSID=k8k6oaoclodj9o8a9v250sdjnt'
    },
    data : data
    };

    try{``
        let res = await axios(config)
        if(res.status == 200){
            // test for status you want, etc
            console.log(res.status)
        }    
        // Don't forget to return something   
        return res.data
    }
    catch (err) {
        console.error(err);
    }
}

let token;

async function get_token() {
  token = await getToken();
  // console.log(token);
}

// Call the get_token() function initially
get_token();

// Schedule the next execution every 2 hours
setInterval(get_token, 2 * 60 * 60 * 1000);
//---------------------------------------------------------


function items_data(items_array,flid) {
  const items = items_array.items;
  const item_arr = new Array(items.length);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const item_arr1 = {
      id: item.product_id.toString(), //i changed here item_id to product_id
      fulfillment_id: flid,//when we generate fulfillments id in on_select store it and retrieve it
      quantity: {
        count: item.qty_ordered, 
      }//,
   //   tags: {
    //    status: items_array.status
    //  }
    };

    item_arr[i] = item_arr1;
  }

  return item_arr;
}

function breakup_data(orderStat_data,count,full_id) { //breakup data of oncofirm  and onstatus
  const items = orderStat_data.items;
  const breakupArr = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemData = {
      "@ondc/org/item_id": item.product_id.toString(),
      "@ondc/org/item_quantity": {
        count:item.qty_ordered, // not mapped yet
      },
      title: item.name,
      "@ondc/org/title_type":"item",
      price: {
        currency: "INR",
        value: (item.price*item.qty_ordered).toString(),//#home changes
      },
      "item":
      {
        "price":
        {
          "currency":"INR",
          "value":item.price.toString()
        }
      }
    };
    const additionalItems = [
      {
        "@ondc/org/item_id": full_id,
        title: "Delivery charges",
        "@ondc/org/title_type": "delivery",
        price: {
          currency: "INR",
          value: "0",
        },
      },
      {
        "@ondc/org/item_id": full_id,
        title: "Packing charges",
        "@ondc/org/title_type": "packing",
        price: {
          currency: "INR",
          value: "0",
        },
      },
      {
        "@ondc/org/item_id":  item.product_id.toString(),
        title: "Tax",
        "@ondc/org/title_type": "tax",
        price: {
          currency: "INR",
          value: "0",
        },
      },
      {
        "@ondc/org/item_id": item.product_id.toString(),
        title: "Discount",
        "@ondc/org/title_type": "discount",
        price: {
          currency: "INR",
          value: "0",
        },
      },
      {
        "@ondc/org/item_id": full_id,
        title: "Convenience Fee",
        "@ondc/org/title_type": "misc",
        price: {
          currency: "INR",
          value: "0",
        },
      },
    ];

    // Modify the specific properties of each additional item
    for (let j = 0; j < additionalItems.length; j++) {
      const additionalItem = additionalItems[j];
      if (additionalItem["@ondc/org/item_id"] === item.product_id) {
        additionalItem["@ondc/org/item_quantity"] = {
          count: item.qty_ordered,
        };
        additionalItem.price.value = item.price.toString();
      }
    }

    // Combine all items into an array and push it
    const allItems = [itemData, ...additionalItems];
    breakupArr.push(...allItems);
  }

  return breakupArr;
}
export const getProductsByIds = async (idsArray, token) => {
    
  let config = {
      method: 'get',
      url: 'https://tataepp.stagingshop.com/rest/V1/products?searchCriteria[filterGroups][0][filters][0][field]=entity_id&searchCriteria[filterGroups][0][filters][0][condition_type]=in&searchCriteria[filterGroups][0][filters][0][value]='+idsArray,
      headers: { 
        'Authorization': 'Bearer ' + token, 
        'Cookie': 'PHPSESSID=k8k6oaoclodj9o8a9v250sdjnt'
      }
    };
    
    try{
      let res = await axios(config)
      if(res.status == 200){
          console.log(res.status)
      }    
      return res.data
  }
  catch (err) {
      console.error(err);
  }
}

//function and api for creating order
export const createOrder = async (token, billingDetails, shippingDetails, items) => {
    let itemTemplate = {
        "base_discount_amount": 0,
        "base_original_price": 45,
        "base_price": 45,
        "base_price_incl_tax": 45,
        "base_row_invoiced": 0,
        "base_row_total": 45,
        "base_tax_amount": 0,
        "base_tax_invoiced": 0,
        "discount_amount": 0,
        "discount_percent": 0,
        "free_shipping": 0,
        "is_virtual": 0,
        
        "name": "Push It Messenger Bag",
        "original_price": 45,
        "price": 45,
        "price_incl_tax": 45,
        "product_id": 14,
        "product_type": "simple",
        "qty_ordered": 1,
        "row_total": 45,
        "row_total_incl_tax": 45,
        "sku": "TVS Apache RTR",
        "store_id": 1,
        //"item_id": 123,
       

      }

    let idsArray = ['1']  //hack coz magento ignores first element from search
    items.forEach(function (item) {
    idsArray.push(item.id)
    });
    let products = await getProductsByIds(idsArray, token);
    let totalPrice = 0;
    let totalQty = 0;
    let street = [];
   
    let magentoItems = [];
    
    products.items.forEach(function (item) {
     
        //console.log(item);
        console.log("item.id")  
        console.log(item.id)
        let itemTemp = JSON.parse(JSON.stringify(itemTemplate));
        //itemTemp.item_id = item.id;
        itemTemp.name = item.name;
        itemTemp.original_price = item.price;
        itemTemp.price = item.price;
        itemTemp.base_original_price = item.price;
        itemTemp.base_price = item.price;
        itemTemp.base_row_total = item.price;
        itemTemp.product_id = item.id;
        itemTemp.price_incl_tax = item.price;
        itemTemp.row_total = item.price;
        itemTemp.row_total_incl_tax = item.price;
        itemTemp.sku = item.sku;
        //itemTemp.item_id = item.id;

        itemTemp.qty_ordered = items[items.findIndex(obj => obj.id==item.id)].quantity.count;;
        totalPrice = totalPrice + itemTemp.price * itemTemp.qty_ordered;
        totalQty = totalQty + itemTemp.qty_ordered;
        //itemTemp.item_id = item.id;
        magentoItems.push(itemTemp);
        //magentoItems[i].item_id = item.id;
      });
      
      if(billingDetails.email === "")
      {
        var new_var=billingDetails.phone+"@gmail.com"
      }
      else
      {
        var new_var=billingDetails.email
      }
      if(shippingDetails.end.contact.email === "")
      {
        var new_var_ship=shippingDetails.end.contact.phone+"@gmail.com"
      }
      else
      {
        var new_var_ship=shippingDetails.end.contact.email
      }
    const phoneNumber = billingDetails.phone;
const cleanedNumber = phoneNumber.replace(/^(\+91|0)?/, '');

const phoneNumber_ship = shippingDetails.end.contact.phone;
const cleanedNumber_ship = phoneNumber_ship.replace(/^(\+91|0)?/, '');
      let postcode = '' + billingDetails.address.area_code
    let data = JSON.stringify({
        "entity": {
          "base_currency_code": "INR",
          "base_discount_amount": 0,
          "base_grand_total": totalPrice,
          "base_shipping_amount": 0,
          "base_subtotal": totalPrice,
          "base_tax_amount": 0,
          "customer_email": new_var,//billingDetails.email,//new_var,//new_var,
          "customer_firstname": billingDetails.name,
          "customer_group_id": 1,
          "customer_is_guest": 1,
          "customer_lastname": billingDetails.name,
          "customer_note_notify": 1,
          "discount_amount": 0,
          "email_sent": 1,
          "coupon_code": "",
          "discount_description": "",
          "grand_total": totalPrice + deliveryCharge,
          "is_virtual": 0,
          "order_currency_code": "INR",
          "shipping_amount": deliveryCharge,
          "shipping_description": "Flat Rate - Fixed",
          "state": "new",
          "status": "pending",
          "store_currency_code": "INR",
          "store_id": 1,
          "store_name": "ZRPL ONDC STORE",
          "subtotal": totalPrice,
          "subtotal_incl_tax": totalPrice,
          "tax_amount": 0,
          "total_item_count": totalQty,
          "total_qty_ordered": totalQty,
          "weight": 1,
          "items": magentoItems,
          "billing_address": {
            "address_type": "billing",
            "city": billingDetails.address.city,
            "company": "",
            "country_id": "IN",
            "email": billingDetails.email,
            "firstname": billingDetails.name,
            "lastname": billingDetails.name,
            "postcode": billingDetails.address.area_code,
            "region": "Karnataka",
            "region_code": "KA",
            "region_id": 585,
            "street": [billingDetails.address.street , billingDetails.address.building],
            "telephone":cleanedNumber//billingDetails.phone
          },
          "payment": {
            "method": "cod"
          },
          "extension_attributes": {
            "shipping_assignments": [
              {
                "shipping": {
                  "address": {
                    "address_type": "shipping",
                    "city": shippingDetails.end.location.address.city,
                    "company": "",
                    "country_id": "IN",
                    "customer_address_id": 2,
                    "email":new_var_ship,//shippingDetails.end.contact.email,
                    "firstname": shippingDetails.end.person.name,
                    "lastname": shippingDetails.end.person.name,
                    "postcode": shippingDetails.end.location.address.area_code,
                    "region": "Karnataka",
                    "region_code": "KA",
                    "region_id": 585,
                    "street": [shippingDetails.end.location.address.street , shippingDetails.end.location.address.building],
                    "telephone":cleanedNumber_ship//shippingDetails.end.contact.phone
                  },
                  "method": "flatrate"
                }
              }
            ]
          }
        }
      });
       
     // console.log(data);
      var config = {
        method: 'put',
        url: 'https://tataepp.stagingshop.com/rest/V1/orders/create',
        headers: { 
          'Authorization': 'Bearer ' + token, 
          'Content-Type': 'application/json', 
          'Cookie': 'PHPSESSID=53084cvshkemn76knhbkm9ndjv'
        },
        data : data
      };
      
      try{
        let res = await axios(config)
        if(res.status == 200){
            // test for status you want, etc
            console.log(res.status)
        }    
        // Don't forget to return something   
        return res.data
    }
    catch (err) {
        console.error(err);
    }
}


//fucltion and api for getting order details
export const getOrderDetails = async (orderId, token) =>
{
  var config = {
    method: 'get',
    url: 'https://tataepp.stagingshop.com/rest/V1/orders/' + orderId,
    headers: { 
      'Authorization': 'Bearer ' + token, 
      'Cookie': 'PHPSESSID=p7i40cmamm62kqe08rmlbpt88j'
    }
  };

  try
  {
    let res = await axios(config)
    if(res.status == 200)
    {
      console.log(res.status)
    }
    return res.data
  }
  catch (err)
  {
    console.error(err);
  }
}




//other api's for our megtno
export const insertPartnerId = async (incrementId, partnerId, token) =>
{
  var data = JSON.stringify({
    "param": {
      "increment_id": incrementId,
      "partner_id": partnerId,
      "partner_name": "ZEPP_ONDC"
    }
  });
  
  var config = {
    method: 'post',
    url: 'https://tataepp.stagingshop.com/rest/V1/epp-insertorderpartnerdetail/orderpartnerdetails',
    headers: { 
      'Authorization': 'Bearer ' + token, 
      'Content-Type': 'application/json'
    },
    data : data
  };
  
  try{
    let res = await axios(config)
    if(res.status == 200){
        // test for status you want, etc
        console.log(res.status)
    }    
    // Don't forget to return something   
    return res.data
}
catch (err) {
    console.error(err);
}
}
export const updateCommentsInOrder = async (OndcOrderId, timestamp, magentoOrderId, token) =>
{
  var data = JSON.stringify({
    "statusHistory": {
      "comment": "ONDC Order ID: " + OndcOrderId,
      "created_at": timestamp,
      "parent_id": magentoOrderId,
      "is_customer_notified": 0,
      "is_visible_on_front": 0,
      "status": "processing"
    }
  });

  var config = {
    method: 'post',
    url: 'https://tataepp.stagingshop.com/rest/V1/orders/' + magentoOrderId + '/comments',
    headers: { 
      'Authorization': 'Bearer ' + token, 
      'Content-Type': 'application/json', 
      'Cookie': 'PHPSESSID=114mpmakcr6ctoulg7laua47hc'
    },
    data : data
  };

  try
  {
    let res = await axios(config)
    if(res.status == 200)
    {
      console.log(res.status)
    }
    return res.data
  }
  catch (err)
  {
    console.error(err);
  }
}

//thsi is  the fucntion for processing onconfirm response
// Sending an order confirmation to the customer post payment (COD / Prepaid orders)
export const sendOnConfirmResponse = async (body) => {
  
//order created here
let order = await createOrder(token, body.message.order.billing, body.message.order.fulfillments[0], body.message.order.items);

 console.log(order)
  console.log('order entity id');
 console.log(order.entity_id);
 console.log("order created");
 console.log("order created succsessfully");
//getting order details
let orderDetails =await getOrderDetails(order.entity_id,token);

  let orderState = ""
  if (orderDetails.status === "new")
  orderState = "Created"
  if (orderDetails.status === "pending")
  orderState = "Accepted"
  if (orderDetails.status === "canceled")
  orderState = "Cancelled"
  
  let bppCtxt = JSON.parse(JSON.stringify(bppContext));
  bppCtxt.transaction_id = body.context.transaction_id;
  bppCtxt.message_id = body.context.message_id;
  bppCtxt.timestamp = new Date().toISOString();
  bppCtxt.action = "on_confirm";
  bppCtxt.bap_id=body.context.bap_id;
  bppCtxt.bap_uri=body.context.bap_uri;
  bppCtxt.bpp_id=body.context.bpp_id;
  bppCtxt.bpp_uri=body.context.bpp_uri;
  bppCtxt.domain="nic2004:52110";

  
  
  
const inputDate = new Date(body.context.timestamp);

// Add 8 days to the date
const outputDate = new Date(inputDate.setDate(inputDate.getDate() + 8));

// Output the result in ISO format
//console.log(outputDate.toISOString());
  //----------------------------------------------------------------------------------------
  var items_arr=items_data(orderDetails,body.message.order.fulfillments[0].id);
  //console.log("items array is"+items_arr);
  var breakup_arr_confirm=breakup_data(orderDetails,'',body.message.order.fulfillments[0].id);
 // console.log("breakup array is"+breakup_arr_confirm);  
//many changes 
  let payload = {
    "context": bppCtxt,
    "message": {
      "order": {
        "id": body.message.order.id,
        "state": orderState,
        "provider": {
          "id":"ZEPP",
           "locations":
           [
           {
             "id":"wfhlb-1000"
             }
             ],
               "rateable":true
        },
        
        "items":items_arr,
       "billing": {
  "name": orderDetails.billing_address.firstname,
  "address": {
    //"door": orderDetails.billing_address.street[0],
    //Not specified in api payload house name
    "name":  orderDetails.billing_address.street[0],
    //Not specified in api payload building
    "building": orderDetails.billing_address.street[0],
    "locality": orderDetails.billing_address.street[0],
    "city": orderDetails.billing_address.city,
    "state": orderDetails.billing_address.region,
    "country": "IND",
    "area_code": orderDetails.billing_address.postcode
  },
  "email": orderDetails.billing_address.email,
  "phone": orderDetails.billing_address.telephone,
  "created_at": orderDetails.created_at,
  "updated_at": orderDetails.updated_at
},

        "fulfillments": 
        [
        {
        "id":body.message.order.fulfillments[0].id,
        "@ondc/org/provider_name":"ZRPL",

        "state":
            {
            "descriptor":
            {
              "code":"Pending"           //fullfllemnt state //#doubt dont know what to map
            }
          },
          "type":"Delivery",
          "tracking":true,
          "start":
          {
            "location":
            {
              "id":"wfhlb-1000",
              "descriptor":
              {
                "name":"ZRPL ONDC store",
              },
              "gps":"12.914261,77.638611",
            },
            "time":
            {
              "range":
              {
                "start":body.context.timestamp, // Request body timestamp
                "end": new Date(new Date().setDate(new Date().getDate() + 8)).toISOString() // Add avg delivery lead time (eg: 8 Business days) to start timestamp
              }
            },
            "instructions": // Optional, Ignore for now
            {
              "name":"Status for pickup",
              "short_desc":"Pickup Confirmation Code"
            },
            "contact":
            {
              "phone":"9886098860",
              "email":"support@zrpl.co.in"
            }
          },
          "end":
          {
            "location":
            {
              "gps":body.message.order.fulfillments[0].end.location.gps,
              "address": 
              {
                "name":body.message.order.fulfillments[0].end.location.address.name, //In payload no values for below fields
                "building":body.message.order.fulfillments[0].end.location.address.building,
               // "door":body.message.order.fulfillments[0].end.location.address.building,//remove building add door
                "locality":body.message.order.fulfillments[0].end.location.address.locality,
                "city":body.message.order.fulfillments[0].end.location.address.city,
                "state":body.message.order.fulfillments[0].end.location.address.state,
                "country":body.message.order.fulfillments[0].end.location.address.country,
                "area_code":body.message.order.fulfillments[0].end.location.address.area_code
              }
            },
            "time":
            {
              "range":
              {
                "start":body.context.timestamp, // For now, keep it consistent with start.time.range
                "end":outputDate.toISOString()
              }
            },
            "instructions":
            {
              "name":"Status for drop",
              "short_desc":"Delivery Confirmation Code"
            },
            "contact":
            {
              "phone":"9886098860"
            }
          },
          "rateable":true       
        }        
        ],
        "quote": { 
          "price": {
            "currency": "INR",
            "value": order.base_grand_total.toString() //in on_status we used grandtotal in this we are using total_due #Doubt #home changes
          },
          "breakup": breakup_arr_confirm,
             "ttl":"P1D"

        },
        "payment": {
          "uri": body.message.order.payment.uri, // For now use Juspay URI
          "tl_method": body.message.order.payment.tl_method, // For now use Juspay tl_method
          "params": {
            "currency": "INR",
            "transaction_id":body.message.order.payment.params.transaction_id,
            "amount": body.message.order.payment.params.amount,//#home changes
          },
          "type":"ON-ORDER", // constant
          "status": "PAID", // constant
          "collected_by": "BAP",//constant
          "@ondc/org/buyer_app_finder_fee_type": "percent",
          "@ondc/org/buyer_app_finder_fee_amount": "3",//varies according to categories , conditon is to be added
          // "@ondc/org/withholding_amount": "0.0",
          // "@ondc/org/return_window": "0",
          // "@ondc/org/settlement_basis": "Collection",
          // "@ondc/org/settlement_window": "P2D",
          "@ondc/org/settlement_details": [
            {
              "settlement_counterparty": "seller-app",
              "settlement_phase": "sale-amount",
              "settlement_type": "upi",
              "upi_address": "gft@oksbi",
              "settlement_bank_account_no": "xxxx", // ZRPL Bank Details
              "settlement_ifsc_code": "xxxx", // ZRPL Bank Details
              "beneficiary_name": "xxxx", // ZRPL Bank Details
              "bank_name": "xxxx", // ZRPL Bank Details
              "branch_name": "xxxx" // ZRPL Bank Details
              }
          ]

        },
        
      "created_at":body.context.timestamp,// Request body timestamp
      "updated_at":body.context.timestamp,// Request body timestamp

        
      }
    }
  }
 

  

  
  console.log("=============RESPONSE BODY===================================")
  console.log(JSON.stringify(payload));
  console.log("=============-==============================================")

  let insertPartnerOrderId =await insertPartnerId (order.increment_id, body.message.order.id, token);
 // console.log("insertPartnerOrderId");
 // console.log(insertPartnerOrderId);

  let insertComments =await updateCommentsInOrder (body.message.order.id, order.created_at, order.entity_id, token);
  console.log("execution reached EOM");
 // console.log("insertComments");
  console.log(insertComments);



}


app.post("/confirm", (req, res, next) => {

  console.log("=============REQUEST BODY===================================")
  console.log(JSON.stringify(req.body));
  console.log("=============-==============================================")
  sendOnConfirmResponse(req.body);
  res.status(200).send(ackData);
});

//const port = process.env.PORT;
const port = 4000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
