The registration dialog of all  quickFilters is currently implemented in the legacy xhtml format, using privileged code:

<img width="876" height="574" alt="image" src="https://github.com/user-attachments/assets/a02e85f3-5012-4c12-8bc2-0656c5f7d755" />

It's one of the last xhtml user interfaces of the Add-on and serves as a entrance to the online license shop and has a few important functions:

- inform about the annual license model
- show current license type and expiry date
- show different license options for new and licensed users: Pro and Domain Licenses including:
- provide an upgrade path from quickFilters Pro to a Domain license
- inform about the differences in functionality of the editions via a link to the support site
- select the licensed account info
- transmit preselected licensee's information (name, email)
- transmit the previous license (for entitlements and date when renewing / extending / upgrading) in the referrer `querystring` parameter
- for new users, transmit the last function used that may have started the shopping flow, in order to learn which functions are the most important. this is put into the `referrer` querystring parameter

<img width="1065" height="660" alt="image" src="https://github.com/user-attachments/assets/488314d7-47d7-44ec-941b-1b8854caa743" />

Since all of the necessary information (mail accounts, existing license status) is already present in the background, a rewrite using pure mail API extensions is entirely possible. 

Use the implemented [SmartTemplates registration conversion](https://github.com/RealRaven2000/SmartTemplates/issues/445) as a starting point