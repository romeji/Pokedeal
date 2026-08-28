package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
)

type Monitor struct { ID string `json:"id"`; Name string `json:"name"`; Query string `json:"query"`; Region string `json:"region"`; MinimumPrice *float64 `json:"minimumPrice"`; MaximumPrice *float64 `json:"maximumPrice"`; IntervalSeconds int `json:"intervalSeconds"` }
type Price struct { Amount string `json:"amount"`; Currency string `json:"currency_code"` }
type Photo struct { URL string `json:"url"` }
type CatalogItem struct { ID int64 `json:"id"`; Title string `json:"title"`; Description string `json:"description"`; URL string `json:"url"`; Price Price `json:"price"`; Photo Photo `json:"photo"`; Photos []Photo `json:"photos"` }
type CatalogResponse struct { Items []CatalogItem `json:"items"` }
type Listing struct { ExternalID string `json:"externalId"`; URL string `json:"url"`; Title string `json:"title"`; Description string `json:"description"`; Price float64 `json:"price"`; Currency string `json:"currency"`; SellerCountry string `json:"sellerCountry"`; ImageURLs []string `json:"imageUrls"` }
type TrackedListing struct { ExternalID string `json:"externalId"`; URL string `json:"url"` }
type ListingStatus struct { ExternalID string `json:"externalId"`; Status string `json:"status"` }

var domains=map[string]string{"fr":"www.vinted.fr","be":"www.vinted.be","lu":"www.vinted.lu","de":"www.vinted.de","es":"www.vinted.es","it":"www.vinted.it","nl":"www.vinted.nl","pt":"www.vinted.pt"}

type Bridge struct { baseURL,token,userAgent string; perPage int; apiClient,vintedClient *http.Client; warmed map[string]bool; lastPoll map[string]time.Time; lastStatusCheck time.Time }

func main(){base:=strings.TrimRight(os.Getenv("POKEDEAL_BASE_URL"),"/");token:=os.Getenv("VINTRACK_INGEST_TOKEN");if base==""||token==""{log.Fatal("POKEDEAL_BASE_URL et VINTRACK_INGEST_TOKEN sont obligatoires")};jar,_:=cookiejar.New(nil);ua:=os.Getenv("VINTED_USER_AGENT");if ua==""{ua="Pokedeal-VintrackBridge/1.0"};b:=&Bridge{baseURL:base,token:token,userAgent:ua,perPage:envInt("VINTRACK_PER_PAGE",50,1,96),apiClient:&http.Client{Timeout:15*time.Second},vintedClient:&http.Client{Timeout:12*time.Second,Jar:jar},warmed:map[string]bool{},lastPoll:map[string]time.Time{}};log.Printf("vintrack bridge actif vers %s",base);for{b.cycle(context.Background());time.Sleep(2*time.Second)}}

func (b *Bridge) cycle(ctx context.Context){monitors,err:=b.monitors(ctx);if err!=nil{log.Printf("configuration indisponible: %v",err);time.Sleep(10*time.Second);return};for _,m:=range monitors{interval:=time.Duration(max(15,m.IntervalSeconds))*time.Second;if time.Since(b.lastPoll[m.ID])<interval{continue};b.lastPoll[m.ID]=time.Now();items,err:=b.fetch(ctx,m);if err!=nil{log.Printf("monitor %s: %v",m.Name,err);b.health(ctx,m.ID,false,err.Error());continue};if err=b.ingest(ctx,items);err!=nil{log.Printf("ingestion %s: %v",m.Name,err);b.health(ctx,m.ID,false,err.Error());continue};b.health(ctx,m.ID,true,"");log.Printf("monitor %s: %d annonce(s)",m.Name,len(items))};if time.Since(b.lastStatusCheck)>=5*time.Minute{b.lastStatusCheck=time.Now();b.checkTracked(ctx)}}

func (b *Bridge) monitors(ctx context.Context)([]Monitor,error){var out []Monitor;return out,b.requestJSON(ctx,http.MethodGet,b.baseURL+"/api/internal/vintrack/monitors",nil,&out)}
func (b *Bridge) ingest(ctx context.Context,listings []Listing)error{return b.requestJSON(ctx,http.MethodPost,b.baseURL+"/api/internal/vintrack/listings",map[string]any{"listings":listings},nil)}
func (b *Bridge) health(ctx context.Context,id string,success bool,detail string){_ = b.requestJSON(ctx,http.MethodPost,b.baseURL+"/api/internal/vintrack/monitors",map[string]any{"id":id,"success":success,"error":detail},nil)}

func (b *Bridge) checkTracked(ctx context.Context){var tracked []TrackedListing;if err:=b.requestJSON(ctx,http.MethodGet,b.baseURL+"/api/internal/vintrack/tracked",nil,&tracked);err!=nil{log.Printf("suivi disponibilité: %v",err);return};statuses:=[]ListingStatus{};for _,item:=range tracked{status,err:=b.fetchStatus(ctx,item);if err!=nil{continue};if status!=""{statuses=append(statuses,ListingStatus{ExternalID:item.ExternalID,Status:status})};time.Sleep(300*time.Millisecond)};if len(statuses)>0{if err:=b.requestJSON(ctx,http.MethodPost,b.baseURL+"/api/internal/vintrack/tracked",map[string]any{"statuses":statuses},nil);err!=nil{log.Printf("mise à jour disponibilité: %v",err)}}}
func (b *Bridge) fetchStatus(ctx context.Context,item TrackedListing)(string,error){parsed,err:=url.Parse(item.URL);if err!=nil||parsed.Scheme!="https"||parsed.Hostname()==""{return "",errors.New("URL annonce invalide")};req,_:=http.NewRequestWithContext(ctx,http.MethodGet,item.URL,nil);b.headers(req,parsed.Hostname(),"text/html");res,err:=b.vintedClient.Do(req);if err!=nil{return "",err};defer res.Body.Close();if res.StatusCode==404||res.StatusCode==410{return "REMOVED",nil};if res.StatusCode!=200{return "",fmt.Errorf("statut HTTP %d",res.StatusCode)};raw,err:=io.ReadAll(io.LimitReader(res.Body,3<<20));if err!=nil{return "",err};text:=strings.ToLower(string(raw));if strings.Contains(text,"schema.org/outofstock")||strings.Contains(text,`\"can_buy\":false`)&&strings.Contains(text,`\"is_closed\":true`){return "SOLD",nil};return "",nil}

func (b *Bridge) requestJSON(ctx context.Context,method,target string,body any,out any)error{var reader io.Reader;if body!=nil{raw,_:=json.Marshal(body);reader=bytes.NewReader(raw)};req,err:=http.NewRequestWithContext(ctx,method,target,reader);if err!=nil{return err};req.Header.Set("Authorization","Bearer "+b.token);if body!=nil{req.Header.Set("Content-Type","application/json")};res,err:=b.apiClient.Do(req);if err!=nil{return err};defer res.Body.Close();if res.StatusCode<200||res.StatusCode>=300{raw,_:=io.ReadAll(io.LimitReader(res.Body,4096));return fmt.Errorf("Pokedeal HTTP %d: %s",res.StatusCode,strings.TrimSpace(string(raw)))};if out!=nil{return json.NewDecoder(res.Body).Decode(out)};return nil}

func (b *Bridge) fetch(ctx context.Context,m Monitor)([]Listing,error){domain,ok:=domains[strings.ToLower(m.Region)];if !ok{return nil,fmt.Errorf("région non prise en charge: %s",m.Region)};if !b.warmed[domain]{if err:=b.warm(ctx,domain);err!=nil{return nil,err}};endpoint:=url.URL{Scheme:"https",Host:domain,Path:"/api/v2/catalog/items"};q:=endpoint.Query();q.Set("search_text",m.Query);q.Set("order","newest_first");q.Set("per_page",strconv.Itoa(b.perPage));if m.MinimumPrice!=nil{q.Set("price_from",strconv.FormatFloat(*m.MinimumPrice,'f',2,64))};if m.MaximumPrice!=nil{q.Set("price_to",strconv.FormatFloat(*m.MaximumPrice,'f',2,64))};q.Set("_",strconv.FormatInt(time.Now().UnixMilli(),10));endpoint.RawQuery=q.Encode();req,_:=http.NewRequestWithContext(ctx,http.MethodGet,endpoint.String(),nil);b.headers(req,domain,"application/json");res,err:=b.vintedClient.Do(req);if err!=nil{return nil,err};defer res.Body.Close();if res.StatusCode==401{b.warmed[domain]=false;return nil,errors.New("session expirée, nouvel essai au prochain cycle")};if res.StatusCode==429{return nil,errors.New("limite de requêtes atteinte")};if res.StatusCode!=200{return nil,fmt.Errorf("catalogue HTTP %d",res.StatusCode)};var payload CatalogResponse;if err=json.NewDecoder(io.LimitReader(res.Body,4<<20)).Decode(&payload);err!=nil{return nil,err};out:=make([]Listing,0,len(payload.Items));for _,item:=range payload.Items{price,err:=strconv.ParseFloat(item.Price.Amount,64);if err!=nil||item.ID==0||item.Title==""{continue};itemURL:=item.URL;if strings.HasPrefix(itemURL,"/"){itemURL="https://"+domain+itemURL};images:=[]string{};if item.Photo.URL!=""{images=append(images,item.Photo.URL)};for _,p:=range item.Photos{if p.URL!=""{images=append(images,p.URL)}};out=append(out,Listing{ExternalID:strconv.FormatInt(item.ID,10),URL:itemURL,Title:item.Title,Description:item.Description,Price:price,Currency:item.Price.Currency,ImageURLs:images})};return out,nil}

func (b *Bridge) warm(ctx context.Context,domain string)error{req,_:=http.NewRequestWithContext(ctx,http.MethodGet,"https://"+domain+"/",nil);b.headers(req,domain,"text/html");res,err:=b.vintedClient.Do(req);if err!=nil{return err};defer res.Body.Close();_,_=io.Copy(io.Discard,io.LimitReader(res.Body,256<<10));if res.StatusCode<200||res.StatusCode>=400{return fmt.Errorf("warmup HTTP %d",res.StatusCode)};b.warmed[domain]=true;return nil}
func (b *Bridge) headers(req *http.Request,domain,accept string){req.Header.Set("User-Agent",b.userAgent);req.Header.Set("Accept",accept);req.Header.Set("Accept-Language","fr-FR,fr;q=0.9,en;q=0.7");req.Header.Set("Referer","https://"+domain+"/")}
func envInt(name string,fallback,minValue,maxValue int)int{value,err:=strconv.Atoi(os.Getenv(name));if err!=nil{return fallback};if value<minValue{return minValue};if value>maxValue{return maxValue};return value}
